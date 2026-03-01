"use client";

import { UserProfile } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import { useTheme } from "next-themes";

export default function SettingsPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className="flex flex-col gap-6 h-full max-w-5xl mx-auto w-full">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Settings</h2>
        <p className="text-sm text-muted-foreground">Manage your account, security, and preferences.</p>
      </div>

      <UserProfile
        routing="hash"
        appearance={{
          baseTheme: isDark ? dark : undefined,
          variables: isDark
            ? {
              colorBackground: "#111111",
              colorInputBackground: "#0A0A0A",
              colorText: "#F5F5F5",
              colorTextSecondary: "#A3A3A3",
              colorPrimary: "#818cf8",
              colorDanger: "#ef4444",
              borderRadius: "0.75rem",
            }
            : {
              colorBackground: "#FFFFFF",
              colorInputBackground: "#FAFAFA",
              colorText: "#171717",
              colorTextSecondary: "#737373",
              colorPrimary: "#4F46E5",
              colorDanger: "#ef4444",
              borderRadius: "0.75rem",
            },
          elements: {
            rootBox: "w-full",
            card: "bg-card border border-border shadow-none w-full",
            navbar: "bg-card border-r border-border",
            navbarButton: "text-muted-foreground hover:text-foreground hover:bg-accent",
            pageScrollBox: "bg-card",
            profileSectionTitle: "border-b border-border",
          },
        }}
      />
    </div>
  );
}
