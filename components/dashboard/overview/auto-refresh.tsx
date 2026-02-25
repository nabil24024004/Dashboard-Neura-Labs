"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

const REFRESH_INTERVAL_MS = 60_000; // 60 seconds

export function AutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [router]);

  return null;
}
