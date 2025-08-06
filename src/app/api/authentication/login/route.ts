import { connectionToDatabase } from '@/util/db';
import { compare } from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';
import { RowDataPacket } from 'mysql2';

const SECRET_KEY = process.env.SECRET_KEY as string;
if (!SECRET_KEY) {
    throw new Error("SECRET_KEY is not defined in the environment variables.");
}

export async function OPTIONS() {
    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    });
}

export async function POST(request: NextRequest) {
    try {
        const requestBody = await request.json();

        if (!requestBody.email || !requestBody.password) {
            return new Response(JSON.stringify({ error: 'Email and password are required' }), {
                status: 400,
                headers: defaultHeaders(),
            });
        }

        const db = await connectionToDatabase();

        const [rows] = await db.query<RowDataPacket[]>(
            'SELECT * FROM `user` WHERE `email` = ?',
            [requestBody.email]
        );

        if (rows.length == 0) {
            return new Response(JSON.stringify({ error: 'Invalid email or password' }), {
                status: 401,
                headers: defaultHeaders(),
            });
        }

        const user = rows[0];
        const isPasswordValid = await compare(requestBody.password, user.password);
        if (!isPasswordValid) {
            return new Response(JSON.stringify({ error: 'Invalid email or password' }), {
                status: 401,
                headers: defaultHeaders(),
            });
        }

        const token = jwt.sign(
            {
                id: user.id,
                user_id: user.user_id,
                name: user.name,
                email: user.email,
                image: user.image,
                bio: user.bio,
            },
            SECRET_KEY,
            { expiresIn: '1h' }
        );

        const userData = {
            id: user.id,
            user_id: user.user_id,
            name: user.name,
            email: user.email,
            image: user.image,
            bio: user.bio,
        };

        return new Response(
            JSON.stringify({ token, user: userData }),
            {
                status: 200,
                headers: defaultHeaders(),
            }
        );
    } catch (err) {
        return new Response(
            JSON.stringify({ error: 'Failed to authenticate user', err }),
            {
                status: 500,
                headers: defaultHeaders(),
            }
        );
    }
}

// Common headers function
function defaultHeaders() {
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
}
