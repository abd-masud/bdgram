import "next-auth";

// Extend default NextAuth types
declare module "next-auth" {
    // Augment the Session object with custom user fields
    interface Session {
        user: {
            id?: string;
            user_id?: string;
            name?: string | null;
            email?: string | null;
            image?: string | null;
            bio?: string | null;
            accessToken?: string | null;
        };
    }

    // Extend the User type used in NextAuth callbacks
    interface User {
        id?: string;
        user_id?: string;
        name?: string | null;
        email?: string | null;
        image?: string | null;
        bio?: string | null;
    }

    // Extend JWT structure to persist custom user fields in the token
    declare module "next-auth/jwt" {
        interface JWT {
            id: string;
            user_id: string;
            name: string;
            email: string;
            image?: string;
            bio?: string;
            accessToken?: string;
        }
    }
}
