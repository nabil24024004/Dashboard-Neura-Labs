import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createAdminClient();
    const { data, error } = await supabase
        .from("users")
        .select("id,first_name,last_name,email,role")
        .order("first_name", { ascending: true });

    if (error) {
        console.error("Failed to fetch team members:", error.message);
        return NextResponse.json({ error: "Failed to fetch team members" }, { status: 500 });
    }

    return NextResponse.json({ members: data ?? [] });
}
