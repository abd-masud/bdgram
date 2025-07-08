"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export const useUserRedirect = () => {
    const router = useRouter();
    const pathname = usePathname();
    useEffect(() => {
        const hrmsUser = localStorage.getItem("hrms_user");
        if (!hrmsUser && pathname !== "/") {
            router.push("/auth/login");
        }
    }, [router, pathname]);
};
