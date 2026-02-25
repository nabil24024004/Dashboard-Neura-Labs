import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("activity_logs")
    .select("id, action, entity_type, entity_id, details, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Failed to fetch notifications:", error.message);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }

  return NextResponse.json({ notifications: data ?? [] });
}
