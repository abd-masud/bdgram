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

// Handle preflight OPTIONS request
export async function OPTIONS() {
    const res = NextResponse.json({}, { status: 200 });
    res.headers.set('Access-Control-Allow-Origin', '*');
    res.headers.set('Access-Control-Allow-Methods', 'PUT, OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res;
}

export async function PUT(request: NextRequest) {
    let db;
    try {
        const data = await request.formData();
        const formDataString = data.get('data');
        const formFields = JSON.parse(formDataString as string);

        const { id, name, bio } = formFields;

        // Handle profile image
        const image = data.get('image') as File;
        let imagePost = null;
        if (image && image.size > 0) {
            const imageBytes = await image.arrayBuffer();
            const imageBuffer = Buffer.from(imageBytes);
            const imageFile = image.name;
            await writeFile(path.join(process.cwd(), 'public/uploads/images', imageFile), imageBuffer);
            imagePost = `/uploads/images/${imageFile}`;
        }

        db = await connectionToDatabase();

        const setParts = [];
        const params = [];

        setParts.push('name = ?'); params.push(name);
        setParts.push('bio = ?'); params.push(bio);

        if (imagePost) {
            setParts.push('image = ?');
            params.push(imagePost);
        }

        const query = `UPDATE user SET ${setParts.join(', ')} WHERE id = ?`;
        params.push(id);

        const [result] = await db.query<ResultSetHeader>(query, params);

        if (result.affectedRows === 1) {
            const [updatedUser] = await db.query<RowDataPacket[]>(
                'SELECT * FROM user WHERE id = ?',
                [id]
            );

            if (updatedUser.length === 0) {
                throw new Error('User not found after update');
            }

            const user = updatedUser[0];

            const token = jwt.sign({
                id: user.id,
                name: user.name,
                email: user.email,
                image: user.image,
                bio: user.bio
            }, SECRET_KEY, { expiresIn: '1h' });

            const res = NextResponse.json({
                success: true,
                message: 'User updated successfully',
                token,
                user,
                image: imagePost,
            }, { status: 200 });

            res.headers.set('Access-Control-Allow-Origin', '*');
            return res;
        } else {
            throw new Error('Failed to update user - no rows affected');
        }

    } catch (error) {
        console.error('Error:', error);
        const res = NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'Failed to update user'
        }, { status: 500 });
        res.headers.set('Access-Control-Allow-Origin', '*');
        return res;
    } finally {
        if (db) await db.end();
    }
}
