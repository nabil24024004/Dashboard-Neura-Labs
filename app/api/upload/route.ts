import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { uploadToR2, getR2PublicUrl } from "@/lib/r2/client";

// Determines the right folder based on MIME type
function getFolder(mimeType: string): string {
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

  const folder = forceBucket ?? getFolder(file.type);
  const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const path = `uploads/${safeName}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    await uploadToR2(folder, path, buffer, file.type);
    const publicUrl = getR2PublicUrl(folder, path);

    return NextResponse.json(
      { url: publicUrl, bucket: folder, path, file_name: file.name, file_type: file.type, file_size: file.size },
      { status: 201 }
    );
  } catch (error) {
    console.error("R2 upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
