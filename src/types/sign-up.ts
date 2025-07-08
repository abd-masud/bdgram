import { RowDataPacket } from 'mysql2';

// Result format for checking if a user already exists (e.g., COUNT query)
export interface ExistingUserResult extends RowDataPacket {
    count: number;
}

// Represents a user record fetched from the database
export interface User extends RowDataPacket {
    id: number;
    user_id: string;
    name: string;
    email: string;
    image: string;
    bio: string;
}
