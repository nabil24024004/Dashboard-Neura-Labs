"use client";

import { UserProfile } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6 h-full max-w-5xl mx-auto w-full">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-[#F5F5F5]">Settings</h2>
        <p className="text-sm text-[#737373]">Manage your account, security, and preferences.</p>
      </div>

      <UserProfile
        routing="hash"
        appearance={{
          baseTheme: dark,
          variables: {
            colorBackground: "#111111",
            colorInputBackground: "#0A0A0A",
            colorText: "#F5F5F5",
            colorTextSecondary: "#A3A3A3",
            colorPrimary: "#818cf8",
            colorDanger: "#ef4444",
            borderRadius: "0.75rem",
          },
          elements: {
            rootBox: "w-full",
            card: "bg-[#111111] border border-[#262626] shadow-none w-full",
            navbar: "bg-[#0A0A0A] border-r border-[#262626]",
            navbarButton: "text-[#A3A3A3] hover:text-[#F5F5F5] hover:bg-[#171717]",
            pageScrollBox: "bg-[#111111]",
            profileSectionTitle: "border-b border-[#262626]",
          },
        }}
      />
    </div>
  );
}
