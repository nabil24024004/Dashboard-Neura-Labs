"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function AutoRefresh({ intervalMs = 30000 }: { intervalMs?: number }) {
    const router = useRouter();

    useEffect(() => {
        const intervalId = setInterval(() => {
            router.refresh(); // Soft-reloads the current route, refetching Server Components
        }, intervalMs);

        return () => clearInterval(intervalId);
    }, [router, intervalMs]);

    // This is a headless component that doesn't render anything
    return null;
}
