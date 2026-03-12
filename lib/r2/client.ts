import {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
} from "@aws-sdk/client-s3";

// ─── Singleton S3-compatible client for Cloudflare R2 ────────────────

let s3: S3Client;

function getR2Client(): S3Client {
    if (!s3) {
        const accountId = process.env.R2_ACCOUNT_ID;
        const accessKeyId = process.env.R2_ACCESS_KEY_ID;
        const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

        if (!accountId || !accessKeyId || !secretAccessKey) {
            throw new Error("Missing R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, or R2_SECRET_ACCESS_KEY env vars");
        }

        s3 = new S3Client({
            region: "auto",
            endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
            credentials: { accessKeyId, secretAccessKey },
        });
    }
    return s3;
}

// ─── Helpers ─────────────────────────────────────────────────────────

const BUCKET = () => process.env.R2_BUCKET_NAME ?? "neosparkxstorage";
const PUBLIC_URL = () => process.env.R2_PUBLIC_URL ?? "";

/**
 * Upload a file to R2.
 * @param folder  Logical folder prefix (e.g. "designs", "contracts", "deliverables")
 * @param path    Object key within the folder (e.g. "uploads/1710000000-file.png")
 * @param body    File contents as Buffer
 * @param contentType  MIME type
 */
export async function uploadToR2(
    folder: string,
    path: string,
    body: Buffer,
    contentType: string
): Promise<void> {
    const client = getR2Client();
    const key = `${folder}/${path}`;

    await client.send(
        new PutObjectCommand({
            Bucket: BUCKET(),
            Key: key,
            Body: body,
            ContentType: contentType,
        })
    );
}

/**
 * Delete a file from R2.
 * @param key Full object key (e.g. "designs/uploads/1710000000-file.png")
 */
export async function deleteFromR2(key: string): Promise<void> {
    const client = getR2Client();

    await client.send(
        new DeleteObjectCommand({
            Bucket: BUCKET(),
            Key: key,
        })
    );
}

/**
 * Get the public URL for an R2 object.
 * @param folder  Logical folder prefix
 * @param path    Object key within the folder
 */
export function getR2PublicUrl(folder: string, path: string): string {
    return `${PUBLIC_URL()}/${folder}/${path}`;
}

/**
 * Extract the R2 object key from a public URL.
 * Returns null if the URL doesn't match the R2 public URL pattern.
 */
export function getR2KeyFromUrl(url: string): string | null {
    const publicUrl = PUBLIC_URL();
    if (!publicUrl || !url.startsWith(publicUrl)) return null;
    // Strip the public URL prefix and leading slash
    return url.slice(publicUrl.length).replace(/^\//, "");
}
