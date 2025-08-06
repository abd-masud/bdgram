import { NextResponse } from "next/server";
import { connectionToDatabase } from "@/util/db";
import crypto from "crypto";
import { RowDataPacket } from "mysql2";
import nodemailer from "nodemailer";

// ✅ CORS headers
const corsHeaders = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'POST, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// ✅ Handle preflight request for CORS
export async function OPTIONS() {
	return new NextResponse(null, {
		status: 204,
		headers: corsHeaders,
	});
}

// ✅ Main POST handler to send OTP
export async function POST(req: Request) {
	try {
		const { email } = await req.json();

		if (!email) {
			return NextResponse.json(
				{ message: "Email is required" },
				{ status: 400, headers: corsHeaders }
			);
		}

		const db = await connectionToDatabase();

		const [rows] = await db.query<RowDataPacket[]>(
			"SELECT email FROM user WHERE email = ?",
			[email]
		);

		if (!Array.isArray(rows) || rows.length == 0) {
			return NextResponse.json(
				{ message: "User not found" },
				{ status: 404, headers: corsHeaders }
			);
		}

		// Generate and hash OTP
		const otp = Math.floor(100000 + Math.random() * 900000).toString();
		const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
		const otpExpiresAt = new Date(Date.now() + 2 * 60 * 1000);

		await db.query(
			"UPDATE user SET otp = ?, otp_expires_at = ? WHERE email = ?",
			[otpHash, otpExpiresAt, email]
		);

		await sendOtpEmail(email, otp);

		return NextResponse.json(
			{ message: "OTP resent successfully" },
			{ status: 200, headers: corsHeaders }
		);
	} catch (err) {
		console.error("OTP Error:", err);
		return NextResponse.json(
			{ message: "Server error" },
			{ status: 500, headers: corsHeaders }
		);
	}
}

// ✅ Helper function to send OTP email
async function sendOtpEmail(email: string, otp: string) {
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
}
