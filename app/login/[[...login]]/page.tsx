import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <SignIn
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-card border border-border rounded-2xl shadow-xl",
            headerTitle: "text-foreground",
            headerSubtitle: "text-muted-foreground",
            socialButtonsBlockButton: "border-border text-foreground hover:bg-accent",
            socialButtonsBlockButtonText: "text-foreground",
            dividerLine: "bg-accent",
            dividerText: "text-muted-foreground",
            formFieldLabel: "text-foreground",
            formFieldInput: "bg-background border-border text-foreground rounded-xl",
            formButtonPrimary: "bg-primary hover:bg-primary/90 text-white rounded-xl",
            footerActionText: "text-muted-foreground",
            footerActionLink: "text-primary hover:text-primary/80",
          },
        }}
      />
    </div>
  );
}
