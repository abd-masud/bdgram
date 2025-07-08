import { hash } from 'bcryptjs';
import { ResultSetHeader } from 'mysql2';
import { NextRequest, NextResponse } from 'next/server';
import { connectionToDatabase } from '@/util/db';
import { ExistingUserResult, User } from '@/types/sign-up';

// Default CORS headers
function corsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };
}

// Handle CORS preflight
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: corsHeaders(),
    });
}

// Register User
export async function POST(request: NextRequest) {
    try {
        const { name, email, password } = await request.json();

        if (!name || !email || !password) {
            return NextResponse.json(
                { success: false, message: "Missing required fields" },
                { status: 400, headers: corsHeaders() }
            );
        }

        const hashedPassword = await hash(password, 10);
        const db = await connectionToDatabase();

        // Check if email already exists
        const [existingUser] = await db.query<ExistingUserResult[]>(
            `SELECT COUNT(*) AS count FROM user WHERE email = ?`,
            [email]
        );

        if (existingUser[0]?.count > 0) {
            return NextResponse.json(
                { success: false, message: "Email already exists" },
                { status: 409, headers: corsHeaders() }
            );
        }

        let user_id: string | undefined = undefined;
        let isUnique = false;

        while (!isUnique) {
            const tempId = Math.floor(100000 + Math.random() * 900000).toString();

            const [existingId] = await db.query<ExistingUserResult[]>(
                `SELECT COUNT(*) AS count FROM user WHERE user_id = ?`,
                [tempId]
            );

            if (existingId[0]?.count == 0) {
                user_id = tempId;
                isUnique = true;
            }
        }

        // Insert user
        const [result] = await db.query<ResultSetHeader>(
            `INSERT INTO user (user_id, name, email, password)
             VALUES (?, ?, ?, ?)`,
            [user_id!, name, email, hashedPassword]
        );

        if (result.affectedRows !== 1) {
            throw new Error('Failed to insert user');
        }

        return NextResponse.json(
            {
                success: true,
                message: 'User registered successfully',
                user_id, // return generated user_id
            },
            { status: 201, headers: corsHeaders() }
        );
    } catch (err) {
        return NextResponse.json(
            { message: 'Failed to register user', err },
            { status: 500, headers: corsHeaders() }
        );
    }
}


// Get All Users
export async function GET() {
    try {
        const db = await connectionToDatabase();
        const [user] = await db.query<User[]>("SELECT * FROM user");

        return NextResponse.json(user, { status: 200, headers: corsHeaders() });
    } catch {
        return NextResponse.json(
            { error: "Failed to fetch user" },
            { status: 500, headers: corsHeaders() }
        );
    }
}

// Delete User
export async function DELETE(request: NextRequest) {
    try {
        const { id } = await request.json();

        if (!id) {
            return NextResponse.json(
                { error: "User ID is required" },
                { status: 400, headers: corsHeaders() }
            );
        }

        const db = await connectionToDatabase();
        const [result] = await db.execute<ResultSetHeader>(
            "DELETE FROM user WHERE id = ?",
            [id]
        );

        if (result.affectedRows == 0) {
            return NextResponse.json(
                { error: "No user found with the specified ID" },
                { status: 404, headers: corsHeaders() }
            );
        }

        return NextResponse.json(
            { message: "User deleted successfully" },
            { status: 200, headers: corsHeaders() }
        );
    } catch {
        return NextResponse.json(
            { error: "Failed to delete user" },
            { status: 500, headers: corsHeaders() }
        );
    }
}
