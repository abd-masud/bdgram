import { NextResponse } from "next/server";
import { connectionToDatabase } from "@/util/db";
import crypto from "crypto";
import { RowDataPacket } from "mysql2";

// ✅ Default CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ✅ Handle preflight CORS request
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

// ✅ Handle OTP verification
export async function POST(req: Request) {
  try {
    const { otp, email } = await req.json();

    if (!otp || !email) {
      return NextResponse.json(
        { message: "OTP and email are required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const db = await connectionToDatabase();

    const [rows] = await db.query<RowDataPacket[]>(
      "SELECT otp FROM user WHERE email = ? AND otp_expires_at > NOW()",
      [email]
    );

    if (!Array.isArray(rows) || rows.length == 0) {
      return NextResponse.json(
        { message: "Invalid or expired OTP" },
        { status: 400, headers: corsHeaders }
      );
    }

    const storedOtpHash = rows[0].otp as string;
    const inputOtpHash = crypto.createHash("sha256").update(otp).digest("hex");

    if (storedOtpHash !== inputOtpHash) {
      return NextResponse.json(
        { message: "Invalid OTP" },
        { status: 400, headers: corsHeaders }
      );
    }

    await db.query(
      "UPDATE user SET otp = NULL, otp_expires_at = NULL WHERE email = ?",
      [email]
    );

    return NextResponse.json(
      { message: "OTP verified successfully" },
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    return NextResponse.json(
      { message: "Server error", err },
      { status: 500, headers: corsHeaders }
    );
  }
}
