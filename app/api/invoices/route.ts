import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { queryDocs, getDoc, insertDoc, updateDoc, deleteDoc, countDocs, serializeDoc } from "@/lib/firebase/db";
import { logActivity } from "@/lib/activity-log";

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t.length > 0 ? t : null;
}

function normalizeDate(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d.toISOString().split("T")[0];
}

function normalizeNumber(value: unknown): number | null {
  const n = Number(value);
  return isFinite(n) ? n : null;
}

function normalizeStatus(value: unknown): "Draft" | "Pending" | "Paid" | "Overdue" | "Partial" {
  const valid = ["Draft", "Pending", "Paid", "Overdue", "Partial"];
  if (typeof value === "string" && valid.includes(value))
    return value as "Draft" | "Pending" | "Paid" | "Overdue" | "Partial";
  return "Draft";
}

async function enrichInvoice(doc: Record<string, unknown>) {
  if (doc.client_id && !doc.client_name) {
    const client = await getDoc("clients", doc.client_id as string);
    if (client) doc.client_name = client.company_name;
  }
  return { ...doc, clients: doc.client_name ? { company_name: doc.client_name } : null };
}

async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await countDocs("invoices");
  const num = String(count + 1).padStart(4, "0");
  return `INV-${year}-${num}`;
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data = await queryDocs("invoices", [], [{ field: "created_at", direction: "desc" }]);
    const enriched = await Promise.all(data.map((d) => enrichInvoice(serializeDoc(d))));
    return NextResponse.json({ invoices: enriched });
  } catch (error) {
    console.error("Failed to fetch invoices:", error);
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const client_id = normalizeText(body?.client_id);
  if (!client_id) return NextResponse.json({ error: "Client is required" }, { status: 400 });

  const amount = normalizeNumber(body?.amount);
  if (amount === null || amount <= 0)
    return NextResponse.json({ error: "Valid amount is required" }, { status: 400 });

  const issue_date = normalizeDate(body?.issue_date);
  if (!issue_date) return NextResponse.json({ error: "Issue date is required" }, { status: 400 });

  const due_date = normalizeDate(body?.due_date);
  if (!due_date) return NextResponse.json({ error: "Due date is required" }, { status: 400 });

  // Denormalize client name
  let client_name: string | null = null;
  const client = await getDoc("clients", client_id);
  if (client) client_name = client.company_name as string;

  const invoice_number = normalizeText(body?.invoice_number) ?? (await generateInvoiceNumber());

  const payload: Record<string, unknown> = {
    client_id,
    client_name,
    invoice_number,
    amount,
    issue_date,
    due_date,
    currency: normalizeText(body?.currency) ?? "USD",
    status: normalizeStatus(body?.status),
  };

  const project_id = normalizeText(body?.project_id);
  if (project_id) payload.project_id = project_id;
  const notes = normalizeText(body?.notes);
  if (notes) payload.notes = notes;
  const tax_percent = normalizeNumber(body?.tax_percent);
  if (tax_percent !== null) payload.tax_percent = tax_percent;

  try {
    const data = await insertDoc("invoices", payload);

    await logActivity({
      userId,
      action: "Created",
      entityType: "invoice",
      entityId: data.id,
      details: { target_name: data.invoice_number as string, amount: data.amount },
    });

    const enriched = await enrichInvoice(serializeDoc(data));
    return NextResponse.json({ invoice: enriched }, { status: 201 });
  } catch (error) {
    console.error("Failed to create invoice:", error);
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const id = normalizeText(body?.id);
  if (!id) return NextResponse.json({ error: "Invoice id required" }, { status: 400 });

  const updates: Record<string, unknown> = {};
  if (body?.status !== undefined) updates.status = normalizeStatus(body.status);
  if (body?.amount !== undefined) updates.amount = normalizeNumber(body.amount);
  if (body?.due_date !== undefined) updates.due_date = normalizeDate(body.due_date);
  if (body?.notes !== undefined) updates.notes = normalizeText(body.notes);

  if (!Object.keys(updates).length)
    return NextResponse.json({ error: "No fields provided" }, { status: 400 });

  try {
    const data = await updateDoc("invoices", id, updates);
    if (!data) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    await logActivity({
      userId,
      action: "Updated",
      entityType: "invoice",
      entityId: data.id,
      details: { target_name: data.invoice_number as string, status: data.status as string },
    });

    const enriched = await enrichInvoice(serializeDoc(data));
    return NextResponse.json({ invoice: enriched });
  } catch (error) {
    console.error("Failed to update invoice:", error);
    return NextResponse.json({ error: "Failed to update invoice" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const id = normalizeText(body?.id);
  if (!id) return NextResponse.json({ error: "Invoice id required" }, { status: 400 });

  try {
    const invoice = await getDoc("invoices", id);
    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

    await deleteDoc("invoices", id);

    await logActivity({
      userId,
      action: "Deleted",
      entityType: "invoice",
      entityId: id,
      details: { target_name: invoice.invoice_number as string },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete invoice:", error);
    return NextResponse.json({ error: "Failed to delete invoice" }, { status: 500 });
  }
}
