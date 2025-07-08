// Interface representing a user object
export interface User {
    id: number;
    user_id: string;
    name: string;
    email: string;
    image: string;
    bio: string;
}

export interface AuthContextType {
    user: User | null;
    setUser: (user: User | null) => void;
}