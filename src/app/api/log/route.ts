import { NextResponse } from "next/server";
import { connectionToDatabase } from "@/util/db";
import { RowDataPacket } from "mysql2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: corsHeaders,
    });
}

// GET - Retrieve user information
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const user_id = searchParams.get("user_id");

        if (!user_id) {
            return NextResponse.json(
                { message: "user_id parameter is required" },
                { status: 400, headers: corsHeaders }
            );
        }

        const db = await connectionToDatabase();

        const query = `
            SELECT 
                user_id,
                name
            FROM user
            WHERE user_id = ?
        `;

        const [rows] = await db.query<RowDataPacket[]>(query, [user_id]);

        if (rows.length === 0) {
            return NextResponse.json(
                { message: "User not found" },
                { status: 404, headers: corsHeaders }
            );
        }

        return NextResponse.json(
            { rows },
            { status: 200, headers: corsHeaders }
        );
    } catch (err) {
        return NextResponse.json(
            { message: "Server error", error: err instanceof Error ? err.message : String(err) },
            { status: 500, headers: corsHeaders }
        );
    }
}