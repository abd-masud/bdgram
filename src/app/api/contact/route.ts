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

export async function POST(req: Request) {
    try {
        const { caller_id, receiver_id } = await req.json();

        if (!caller_id || !receiver_id) {
            return NextResponse.json(
                { message: "caller_id and receiver_id are required" },
                { status: 400, headers: corsHeaders }
            );
        }

        const db = await connectionToDatabase();

        const [existing] = await db.query<RowDataPacket[]>(
            "SELECT * FROM contact WHERE caller_id = ? AND receiver_id = ?",
            [caller_id, receiver_id]
        );

        if (existing.length > 0) {
            return NextResponse.json(
                { message: "Contact already exists" },
                { status: 409, headers: corsHeaders }
            );
        }

        await db.query(
            "INSERT INTO contact (caller_id, receiver_id) VALUES (?, ?)",
            [caller_id, receiver_id]
        );

        return NextResponse.json(
            { message: "Contact added successfully" },
            { status: 201, headers: corsHeaders }
        );
    } catch (err) {
        return NextResponse.json(
            { message: "Server error", error: err },
            { status: 500, headers: corsHeaders }
        );
    }
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const caller_id = searchParams.get("caller_id");

        if (!caller_id) {
            return NextResponse.json(
                { message: "caller_id is required" },
                { status: 400, headers: corsHeaders }
            );
        }

        const db = await connectionToDatabase();

        const query = `
            SELECT
                contact.*,
                user.user_id,
                user.name,
                user.email,
                user.image,
                user.bio
            FROM contact
            JOIN user ON contact.receiver_id = user.user_id
            WHERE contact.caller_id = ?
        `;

        const [rows] = await db.query<RowDataPacket[]>(query, [caller_id]);

        if (rows.length === 0) {
            return NextResponse.json(
                { message: "No contacts found" },
                { status: 404, headers: corsHeaders }
            );
        }

        return NextResponse.json(
            { contacts: rows },
            { status: 200, headers: corsHeaders }
        );
    } catch (err) {
        return NextResponse.json(
            { message: "Server error", error: err },
            { status: 500, headers: corsHeaders }
        );
    }
}

export async function DELETE(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json(
                { message: "id is required" },
                { status: 400, headers: corsHeaders }
            );
        }

        const db = await connectionToDatabase();

        // First check if the contact exists
        const [existing] = await db.query<RowDataPacket[]>(
            "SELECT * FROM contact WHERE id = ?",
            [id]
        );

        if (existing.length == 0) {
            return NextResponse.json(
                { message: "Contact not found" },
                { status: 404, headers: corsHeaders }
            );
        }

        // Delete the contact
        await db.query(
            "DELETE FROM contact WHERE id = ?",
            [id]
        );

        return NextResponse.json(
            { message: "Contact deleted successfully" },
            { status: 200, headers: corsHeaders }
        );
    } catch (err) {
        return NextResponse.json(
            { message: "Server error", error: err },
            { status: 500, headers: corsHeaders }
        );
    }
}