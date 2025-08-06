import { NextResponse } from "next/server";
import { connectionToDatabase } from "@/util/db";
import { RowDataPacket } from "mysql2";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: corsHeaders,
    });
}

export async function GET(req: Request) {
    let db;

    try {
        const { searchParams } = new URL(req.url);
        const user_id = searchParams.get("user_id");

        if (!user_id) {
            return NextResponse.json(
                { message: "user_id is required" },
                { status: 400, headers: corsHeaders }
            );
        }

        db = await connectionToDatabase();
        const query = `SELECT image FROM user WHERE user_id = ?`;
        const [rows] = await db.query<RowDataPacket[]>(query, [user_id]);

        if (rows.length === 0) {
            return NextResponse.json(
                { message: "User not found" },
                { status: 404, headers: corsHeaders }
            );
        }

        const userImage = rows[0].image;

        if (!userImage) {
            return NextResponse.json(
                { message: "No image found for this user" },
                { status: 404, headers: corsHeaders }
            );
        }

        return NextResponse.json(
            { image: userImage },
            { status: 200, headers: corsHeaders }
        );
    } catch (err) {
        console.error("Error fetching user image:", err);
        return NextResponse.json(
            { message: "Server error", error: err instanceof Error ? err.message : "Unknown error" },
            { status: 500, headers: corsHeaders }
        );
    } finally {
        if (db) await db.end();
    }
}