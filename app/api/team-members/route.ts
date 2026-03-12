import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { queryDocs, serializeDoc } from "@/lib/firebase/db";

export async function GET() {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const data = await queryDocs(
            "users",
            [],
            [{ field: "first_name", direction: "asc" }]
        );

        const members = data.map((d) => ({
            id: d.id,
            first_name: d.first_name,
            last_name: d.last_name,
            email: d.email,
            role: d.role ?? null,
        }));

        return NextResponse.json({ members: members.map(serializeDoc) });
    } catch (error) {
        console.error("Failed to fetch team members:", error);
        return NextResponse.json({ error: "Failed to fetch team members" }, { status: 500 });
    }
}
