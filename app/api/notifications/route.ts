import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { queryDocs, serializeDoc } from "@/lib/firebase/db";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data = await queryDocs(
      "activity_logs",
      [],
      [{ field: "timestamp", direction: "desc" }],
      20
    );

    const notifications = data.map((item) => ({
      id: item.id,
      action: item.action,
      entity_type: item.entity_type,
      entity_id: item.entity_id,
      created_at: item.timestamp,
    }));

    return NextResponse.json({ notifications: notifications.map(serializeDoc) });
  } catch (error) {
    console.error("Failed to fetch notifications:", error);
    return NextResponse.json({ error: "Failed to fetch notifications" }, { status: 500 });
  }
}
