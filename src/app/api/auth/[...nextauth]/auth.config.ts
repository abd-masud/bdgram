import { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { connectionToDatabase } from "@/util/db";
import { compare } from "bcryptjs";
import { RowDataPacket } from "mysql2";
import jwt from 'jsonwebtoken';

// NextAuth configuration with Google OAuth and email/password auth
export const authOptions: AuthOptions = {
    secret: process.env.SECRET_KEY,
    providers: [
        // Google provider setup
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),

        // Email/password provider
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "text" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Email and password are required.");
                }

                let db;
                try {
                    db = await connectionToDatabase();
                    const [rows] = await db.query<RowDataPacket[]>(
                        "SELECT * FROM `user` WHERE `email` = ?",
                        [credentials.email]
                    );

                    if (rows.length == 0) throw new Error("Invalid email or password.");

                    const user = rows[0];
                    const isPasswordValid = await compare(credentials.password, user.password);
                    if (!isPasswordValid) throw new Error("Invalid email or password.");

                    return {
                        id: user.id.toString(),
                        user_id: user.user_id,
                        name: user.name,
                        email: user.email,
                        image: user.image,
                        bio: user.bio
                    };
                } catch {
                    throw new Error("Authentication failed. Please try again.");
                } finally {
                    if (db) await db.end();
                }
            },
        }),
    ],
    pages: {
        signIn: "/auth/login",
        error: "/auth/login",
    },
    callbacks: {
        // Handle Google sign-in (create user if new)
        async signIn({ user, account }) {
            if (account?.provider == "google") {
                let db;
                try {
                    db = await connectionToDatabase();
                    const [rows] = await db.query<RowDataPacket[]>(
                        "SELECT * FROM user WHERE email = ?",
                        [user.email]
                    );

                    if (rows.length == 0) {
                        await db.query(
                            "INSERT INTO user (name, email, image) VALUES (?, ?, ?)",
                            [user.name, user.email, user.image || null]
                        );
                        const [newUser] = await db.query<RowDataPacket[]>(
                            "SELECT * FROM user WHERE email = ?",
                            [user.email]
                        );
                        if (newUser.length > 0) {
                            user.id = newUser[0].id.toString();
                            user.user_id = newUser[0].user_id;
                            user.name = newUser[0].name;
                            user.email = newUser[0].email;
                            user.image = newUser[0].image;
                            user.bio = newUser[0].bio;
                        }
                    } else {
                        user.id = rows[0].id.toString();
                        user.name = rows[0].name;
                        user.email = rows[0].email;
                        user.image = rows[0].image;
                        user.bio = rows[0].bio;
                    }

                    return true;
                } catch {
                    return false;
                } finally {
                    if (db) await db.end();
                }
            }
            return true;
        },

        // Add user info to JWT token
        async jwt({ token, user }) {
            if (user) {
                token = { ...token, ...user };
                token.accessToken = jwt.sign(
                    { ...user },
                    process.env.SECRET_KEY!,
                    { expiresIn: '1h' }
                );
            }
            return token;
        },

        // Add user info to session
        async session({ session, token }) {
            session.user = { ...token };
            return session;
        }
    },
    session: {
        strategy: "jwt",
        maxAge: 7 * 24 * 60 * 60, // 7 days
    },
    cookies: {
        sessionToken: {
            name: "bdgram.auth",
            options: {
                httpOnly: true,
                secure: process.env.NODE_ENV == "production",
                sameSite: "lax",
                path: "/",
            },
        },
    },
};