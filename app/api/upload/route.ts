import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Determines the right bucket based on MIME type
function getBucket(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "designs";
  if (mimeType === "application/pdf") return "contracts";
  return "deliverables";
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "Invalid form data" }, { status: 400 });

  const file = formData.get("file") as File | null;
  const forceBucket = formData.get("bucket") as string | null;

  if (!file || file.size === 0)
    return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const bucket = forceBucket ?? getBucket(file.type);
  const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const path = `uploads/${safeName}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  const supabase = createAdminClient();
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (error) {
    console.error("Storage upload error:", error.message);
    return NextResponse.json({ error: `Upload failed: ${error.message}` }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
  return NextResponse.json(
    { url: urlData.publicUrl, bucket, path, file_name: file.name, file_type: file.type, file_size: file.size },
    { status: 201 }
  );
}
