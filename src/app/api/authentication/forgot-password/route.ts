import { NextRequest, NextResponse } from "next/server";
import { connectionToDatabase } from "@/util/db";
import nodemailer from "nodemailer";
import crypto from "crypto";

// ✅ CORS headers to allow external access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ✅ CORS preflight handler
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

// ✅ Send OTP via email with CORS support
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const db = await connectionToDatabase();

    const [rows] = await db.query("SELECT * FROM user WHERE email = ?", [email]);

    if (!Array.isArray(rows) || rows.length == 0) {
      return NextResponse.json(
        { message: "User not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 2 * 60 * 1000);
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    await db.query("UPDATE user SET otp = ?, otp_expires_at = ? WHERE email = ?", [
      otpHash,
      otpExpiresAt,
      email,
    ]);

    const transporter = nodemailer.createTransport({
      host: 'premium900.web-hosting.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `BDGRAM <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your OTP Code",
      html: `
        <h1>Hi, Welcome to BDGRAM!</h1>
        <p><b>OTP:</b> Dear User, your OTP code is <b>${otp}</b>. Please do not share this PIN with anyone.
        <br>It is valid for 2 minutes.</p>
        <p>Best Regards,<br>BDGRAM</p>
      `,
    });

    return NextResponse.json(
      { message: "OTP sent successfully" },
      { status: 200, headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error sending OTP:", error);
    return NextResponse.json(
      { message: "Error sending OTP. Please try again." },
      { status: 500, headers: corsHeaders }
    );
  }
}
