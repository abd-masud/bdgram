import path from 'path';
import { writeFile } from 'fs/promises';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import { NextRequest, NextResponse } from 'next/server';
import { connectionToDatabase } from '@/util/db';
import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.SECRET_KEY as string;
if (!SECRET_KEY) {
    throw new Error("SECRET_KEY is not defined in the environment variables.");
}

// CORS headers helper
function applyCORSHeaders(response: NextResponse) {
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'PUT, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return response;
}

export async function OPTIONS() {
    return applyCORSHeaders(new NextResponse(null));
}

export async function PUT(request: NextRequest) {
    let db;
    try {
        const contentType = request.headers.get('content-type') || '';
        let user_id: string, name: string, bio: string;
        let imagePost: string | null = null;

        // Handle form-data (for file uploads)
        if (contentType.includes('multipart/form-data')) {
            const data = await request.formData();
            const formDataString = data.get('data');

            if (!formDataString) throw new Error('Missing form data');

            ({ user_id, name, bio } = JSON.parse(formDataString as string));
            const image = data.get('image') as File | null;

            // Process image if exists
            if (image?.size && image.size > 0) {
                const buffer = Buffer.from(await image.arrayBuffer());
                const extension = path.extname(image.name);
                const newFilename = `${user_id}${extension}`;

                await writeFile(
                    path.join(process.cwd(), 'public/uploads/images', newFilename),
                    buffer
                );
                imagePost = `/api/uploads/images/${newFilename}`;
            }
        }
        // Handle raw JSON data
        else if (contentType.includes('application/json')) {
            const jsonData = await request.json();
            ({ user_id, name, bio } = jsonData);
        }
        else {
            throw new Error('Unsupported content type. Use multipart/form-data or application/json');
        }

        // Validate required fields
        if (!user_id || !name || !bio) {
            throw new Error('Missing required fields: user_id, name, or bio');
        }

        db = await connectionToDatabase();
        const updates = [];
        const params: string[] = [name, bio];

        updates.push('name = ?', 'bio = ?');
        if (imagePost) {
            updates.push('image = ?');
            params.push(imagePost);
        }

        const [result] = await db.query<ResultSetHeader>(
            `UPDATE user SET ${updates.join(', ')} WHERE user_id = ?`,
            [...params, user_id]
        );

        if (result.affectedRows !== 1) {
            throw new Error('Update failed - user not found or no changes made');
        }

        const [user] = await db.query<RowDataPacket[]>(
            'SELECT * FROM user WHERE user_id = ?', [user_id]
        );

        if (user.length === 0) {
            throw new Error('User not found after update');
        }

        const token = jwt.sign(
            {
                id: user[0].id,
                user_id: user[0].user_id,
                name: user[0].name,
                email: user[0].email,
                image: user[0].image,
                bio: user[0].bio
            },
            SECRET_KEY,
            { expiresIn: '1h' }
        );

        return applyCORSHeaders(
            NextResponse.json({
                success: true,
                token,
                user: {
                    id: user[0].id,
                    user_id: user[0].user_id,
                    name: user[0].name,
                    email: user[0].email,
                    image: user[0].image,
                    bio: user[0].bio
                }
            })
        );

    } catch (error) {
        console.error('Error in profile update:', error);
        return applyCORSHeaders(
            NextResponse.json(
                {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                },
                { status: 500 }
            )
        );
    } finally {
        if (db) await db.end();
    }
}