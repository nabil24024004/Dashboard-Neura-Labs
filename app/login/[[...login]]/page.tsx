import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0A0A0A]">
      <SignIn
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-[#111111] border border-[#262626] rounded-2xl shadow-xl",
            headerTitle: "text-[#F5F5F5]",
            headerSubtitle: "text-[#737373]",
            socialButtonsBlockButton: "border-[#262626] text-[#F5F5F5] hover:bg-[#171717]",
            socialButtonsBlockButtonText: "text-[#F5F5F5]",
            dividerLine: "bg-[#262626]",
            dividerText: "text-[#737373]",
            formFieldLabel: "text-[#F5F5F5]",
            formFieldInput: "bg-[#0A0A0A] border-[#262626] text-[#F5F5F5] rounded-xl",
            formButtonPrimary: "bg-[#6366f1] hover:bg-[#818cf8] text-white rounded-xl",
            footerActionText: "text-[#737373]",
            footerActionLink: "text-[#6366f1] hover:text-[#818cf8]",
          },
        }}
      />
    </div>
  );
}
