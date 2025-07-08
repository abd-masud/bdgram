import { NextResponse } from "next/server";
import { runQuery } from "@/util/db";
import { hash } from 'bcryptjs';
import { User } from "@/types/context";

// ✅ CORS headers for external access
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ✅ Handle CORS preflight
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: corsHeaders,
    });
}

// ✅ Password reset logic with CORS
export async function POST(req: Request) {
    try {
        const { newPassword, email } = await req.json();

        if (!newPassword || !email) {
            return NextResponse.json(
                { message: "Password fields and email are required" },
                { status: 400, headers: corsHeaders }
            );
        }

        const checkEmailQuery = "SELECT * FROM user WHERE email = ?";
        const emailResults = await runQuery(checkEmailQuery, [email]);

        if ((emailResults as User[]).length == 0) {
            return NextResponse.json(
                { message: "User not found" },
                { status: 404, headers: corsHeaders }
            );
        }

        const hashedPassword = await hash(newPassword, 10);
        const updatePasswordQuery = "UPDATE user SET password = ? WHERE email = ?";
        await runQuery(updatePasswordQuery, [hashedPassword, email]);

        return NextResponse.json(
            { message: "Password updated successfully" },
            { status: 200, headers: corsHeaders }
        );
    } catch {
        return NextResponse.json(
            { message: "An error occurred. Please try again." },
            { status: 500, headers: corsHeaders }
        );
    }
}
