/**
 * Firestore data-access helpers.
 *
 * Provides a thin wrapper over Firestore Admin SDK that mirrors
 * the Supabase query patterns used across all API routes.
 */

import { getFirebaseAdmin } from "./config";
import {
    type CollectionReference,
    type DocumentData,
    type Query,
    FieldValue,
} from "firebase-admin/firestore";

// ─── Collection reference ────────────────────────────────────────────

export function collection(name: string): CollectionReference {
    const { db } = getFirebaseAdmin();
    return db.collection(name);
}

// ─── Single document ─────────────────────────────────────────────────

export async function getDoc(
    collectionName: string,
    id: string
): Promise<(DocumentData & { id: string }) | null> {
    const { db } = getFirebaseAdmin();
    const snap = await db.collection(collectionName).doc(id).get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data()! };
}

// ─── Query helpers ───────────────────────────────────────────────────

export interface WhereFilter {
    field: string;
    op: FirebaseFirestore.WhereFilterOp;
    value: unknown;
}

export interface OrderByClause {
    field: string;
    direction?: "asc" | "desc";
}

export async function queryDocs(
    collectionName: string,
    filters: WhereFilter[] = [],
    orderBy: OrderByClause[] = [],
    limitCount?: number
): Promise<(DocumentData & { id: string })[]> {
    const { db } = getFirebaseAdmin();
    let query: Query = db.collection(collectionName);

    for (const f of filters) {
        query = query.where(f.field, f.op, f.value);
    }

    for (const o of orderBy) {
        query = query.orderBy(o.field, o.direction ?? "asc");
    }

    if (limitCount) {
        query = query.limit(limitCount);
    }

    const snap = await query.get();
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

// ─── Insert ──────────────────────────────────────────────────────────

/**
 * Insert a document with an auto-generated ID.
 * Returns the full document data including the generated `id`.
 */
export async function insertDoc(
    collectionName: string,
    data: Record<string, unknown>
): Promise<DocumentData & { id: string }> {
    const { db } = getFirebaseAdmin();
    const docData = {
        ...data,
        created_at: data.created_at ?? FieldValue.serverTimestamp(),
    };
    const ref = await db.collection(collectionName).add(docData);
    // Read back to get server-resolved timestamps
    const snap = await ref.get();
    return { id: snap.id, ...snap.data()! };
}

/**
 * Insert a document with a specific ID (e.g. Clerk user ID).
 */
export async function setDoc(
    collectionName: string,
    id: string,
    data: Record<string, unknown>,
    merge = true
): Promise<void> {
    const { db } = getFirebaseAdmin();
    await db
        .collection(collectionName)
        .doc(id)
        .set(
            { ...data, created_at: data.created_at ?? FieldValue.serverTimestamp() },
            { merge }
        );
}

// ─── Update ──────────────────────────────────────────────────────────

export async function updateDoc(
    collectionName: string,
    id: string,
    data: Record<string, unknown>
): Promise<(DocumentData & { id: string }) | null> {
    const { db } = getFirebaseAdmin();
    const ref = db.collection(collectionName).doc(id);
    await ref.update({ ...data, updated_at: FieldValue.serverTimestamp() });
    const snap = await ref.get();
    if (!snap.exists) return null;
    return { id: snap.id, ...snap.data()! };
}

// ─── Delete ──────────────────────────────────────────────────────────

export async function deleteDoc(
    collectionName: string,
    id: string
): Promise<void> {
    const { db } = getFirebaseAdmin();
    await db.collection(collectionName).doc(id).delete();
}

// ─── Batch helpers ───────────────────────────────────────────────────

/**
 * Delete all documents that match the given filters.
 * Uses batched writes for efficiency.
 */
export async function deleteDocs(
    collectionName: string,
    filters: WhereFilter[]
): Promise<number> {
    const { db } = getFirebaseAdmin();
    let query: Query = db.collection(collectionName);
    for (const f of filters) {
        query = query.where(f.field, f.op, f.value);
    }
    const snap = await query.get();
    if (snap.empty) return 0;

    const batch = db.batch();
    snap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    return snap.size;
}

/**
 * Insert multiple documents in a batch.
 */
export async function insertDocs(
    collectionName: string,
    docs: Record<string, unknown>[]
): Promise<string[]> {
    const { db } = getFirebaseAdmin();
    const batch = db.batch();
    const ids: string[] = [];
    const col = db.collection(collectionName);

    for (const data of docs) {
        const ref = col.doc();
        ids.push(ref.id);
        batch.set(ref, {
            ...data,
            created_at: data.created_at ?? FieldValue.serverTimestamp(),
        });
    }

    await batch.commit();
    return ids;
}

// ─── Count ───────────────────────────────────────────────────────────

export async function countDocs(
    collectionName: string,
    filters: WhereFilter[] = []
): Promise<number> {
    const { db } = getFirebaseAdmin();
    let query: Query = db.collection(collectionName);
    for (const f of filters) {
        query = query.where(f.field, f.op, f.value);
    }
    const snap = await query.count().get();
    return snap.data().count;
}

// ─── Serialize Firestore timestamps for JSON responses ───────────────

/**
 * Recursively converts Firestore Timestamps to ISO strings
 * so the data is JSON-serializable for Next.js API responses.
 */
export function serializeDoc<T extends Record<string, unknown>>(doc: T): T {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(doc)) {
        if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate: unknown }).toDate === "function") {
            result[key] = (value as { toDate: () => Date }).toDate().toISOString();
        } else if (value && typeof value === "object" && !Array.isArray(value)) {
            result[key] = serializeDoc(value as Record<string, unknown>);
        } else {
            result[key] = value;
        }
    }
    return result as T;
}
