"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    if (!mounted) {
        return (
            <Button size="icon" variant="ghost" className="h-9 w-9 text-muted-foreground">
                <Sun className="h-5 w-5" />
            </Button>
        );
    }

    const isDark = theme === "dark";

    return (
        <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
            {isDark ? (
                <Sun className="h-5 w-5 transition-transform duration-300 rotate-0" />
            ) : (
                <Moon className="h-5 w-5 transition-transform duration-300 rotate-0" />
            )}
        </Button>
    );
}
