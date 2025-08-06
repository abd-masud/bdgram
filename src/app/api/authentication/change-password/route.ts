import { connectionToDatabase } from '@/util/db';
import { compare, hash } from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { RowDataPacket } from 'mysql2';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: corsHeaders,
    });
}

export async function POST(request: NextRequest) {
    try {
        const requestBody = await request.json();

        if (!requestBody.email || !requestBody.oldPassword || !requestBody.password) {
            return new NextResponse(
                JSON.stringify({ error: 'Email, old password and new password are required' }),
                {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                }
            );
        }

        const db = await connectionToDatabase();

        const [userRows] = await db.query<RowDataPacket[]>(
            'SELECT * FROM `user` WHERE `email` = ?',
            [requestBody.email]
        );

        if (userRows.length == 0) {
            return new NextResponse(
                JSON.stringify({ error: 'User not found' }),
                {
                    status: 404,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                }
            );
        }

        const user = userRows[0];

        const isOldPasswordValid = await compare(requestBody.oldPassword, user.password);
        if (!isOldPasswordValid) {
            return new NextResponse(
                JSON.stringify({ error: 'Old password is incorrect' }),
                {
                    status: 401,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                }
            );
        }

        const hashedNewPassword = await hash(requestBody.password, 10);
        await db.query(
            'UPDATE `user` SET `password` = ? WHERE `email` = ?',
            [hashedNewPassword, requestBody.email]
        );

        return new NextResponse(
            JSON.stringify({ message: 'Password updated successfully' }),
            {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        );
    } catch (err) {
        console.error('Error changing password:', err);
        return new NextResponse(
            JSON.stringify({ error: 'Failed to change password' }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
        );
    }
}
