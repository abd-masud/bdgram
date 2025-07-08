"use client";

import { AuthContextType, User } from "@/types/context";
import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { useRouter } from "next/navigation";
import { jwtDecode, JwtPayload } from "jwt-decode";

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provides auth context to the app
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const storedUser = localStorage.getItem("hrms_user");

    if (storedUser) {
      try {
        const decode = jwtDecode<JwtPayload & User>(storedUser);
        const userData: User = {
          id: decode.id,
          user_id: decode.user_id,
          name: decode.name,
          email: decode.email,
          image: decode.image,
          bio: decode.bio,
        };
        setUser(userData);
      } catch {
        localStorage.removeItem("hrms_user");
        router.push("/auth/login");
      }
    } else {
      router.push("/auth/login");
    }
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to access auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context == undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
