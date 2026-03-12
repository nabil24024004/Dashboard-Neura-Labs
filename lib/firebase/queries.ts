/**
 * Application-level Firestore queries that replace Supabase RPCs and triggers.
 *
 * - getMyWorkItems  → replaces `get_my_work_items` RPC
 * - getCategoryProgress → replaces `get_category_progress` RPC
 * - computeProjectProgress → replaces the Postgres trigger
 */

import { getFirebaseAdmin } from "./config";

// ─── get_my_work_items RPC replacement ───────────────────────────────

export async function getMyWorkItems(userId: string) {
    const { db } = getFirebaseAdmin();

    // 1. Find all assignments for this user
    const assignSnap = await db
        .collection("work_item_assignments")
        .where("member_id", "==", userId)
        .get();

    if (assignSnap.empty) return [];

    const workItemIds = [
        ...new Set(assignSnap.docs.map((d) => d.data().work_item_id as string)),
    ];

    // 2. Batch-fetch the work items (Firestore `in` supports up to 30)
    const chunks: string[][] = [];
    for (let i = 0; i < workItemIds.length; i += 30) {
        chunks.push(workItemIds.slice(i, i + 30));
    }

    const items: FirebaseFirestore.DocumentData[] = [];
    for (const chunk of chunks) {
        const snap = await db
            .collection("work_items")
            .where("__name__", "in", chunk)
            .get();
        snap.docs.forEach((doc) => items.push({ id: doc.id, ...doc.data() }));
    }

    // 3. Enrich with project name
    const projectIds = [
        ...new Set(items.map((i) => i.project_id as string).filter(Boolean)),
    ];

    const projectMap: Record<string, string> = {};
    for (const chunk of chunkArray(projectIds, 30)) {
        const snap = await db
            .collection("projects")
            .where("__name__", "in", chunk)
            .get();
        snap.docs.forEach((doc) => {
            projectMap[doc.id] = (doc.data().project_name as string) ?? "";
        });
    }

    return items.map((item) => ({
        ...item,
        work_item_id: item.id,
        project_name: projectMap[item.project_id] ?? null,
    }));
}

// ─── get_category_progress RPC replacement ───────────────────────────

export async function getCategoryProgress(projectId: string) {
    const { db } = getFirebaseAdmin();

    const snap = await db
        .collection("work_items")
        .where("project_id", "==", projectId)
        .get();

    if (snap.empty) return [];

    // Group by category, compute completion
    const groups: Record<string, { total: number; done: number }> = {};

    snap.docs.forEach((doc) => {
        const data = doc.data();
        const cat = (data.category as string) || "General";
        if (!groups[cat]) groups[cat] = { total: 0, done: 0 };
        groups[cat].total++;
        if (data.status === "done") groups[cat].done++;
    });

    return Object.entries(groups).map(([category, { total, done }]) => ({
        category,
        total,
        done,
        progress: total > 0 ? Math.round((done / total) * 100) : 0,
    }));
}

// ─── Project progress trigger replacement ────────────────────────────

/**
 * Recompute project progress from work items and update the project doc.
 * Call this after any work item status change.
 */
export async function computeProjectProgress(
    projectId: string
): Promise<number | null> {
    const { db } = getFirebaseAdmin();

    const snap = await db
        .collection("work_items")
        .where("project_id", "==", projectId)
        .get();

    if (snap.empty) return null;

    const total = snap.size;
    const done = snap.docs.filter((d) => d.data().status === "done").length;
    const progress = Math.round((done / total) * 100);

    await db.collection("projects").doc(projectId).update({ progress });

    return progress;
}

// ─── Utility ─────────────────────────────────────────────────────────

function chunkArray<T>(arr: T[], size: number): T[][] {
    const result: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
        result.push(arr.slice(i, i + size));
    }
    return result;
}
