import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/activity-log";

const INVOICE_COLUMNS =
  "id,client_id,project_id,invoice_number,amount,currency,issue_date,due_date,status,notes,tax_percent,created_at,clients(company_name)";

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
  if (typeof value === "string" && valid.includes(value)) {
    return value as "Draft" | "Pending" | "Paid" | "Overdue" | "Partial";
  }
  return "Draft";
}

async function generateInvoiceNumber(supabase: ReturnType<typeof createAdminClient>): Promise<string> {
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true });
  const num = String((count ?? 0) + 1).padStart(4, "0");
  return `INV-${year}-${num}`;
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("invoices")
    .select(INVOICE_COLUMNS)
    .order("issue_date", { ascending: false });

  if (error) {
    console.error("Failed to fetch invoices:", error.message);
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
  }

  return NextResponse.json({ invoices: data ?? [] });
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

  const supabase = createAdminClient();
  const invoice_number =
    normalizeText(body?.invoice_number) ?? (await generateInvoiceNumber(supabase));

  const payload: Record<string, unknown> = {
    client_id,
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

  const { data, error } = await supabase
    .from("invoices")
    .insert(payload)
    .select(INVOICE_COLUMNS)
    .single();

  if (error) {
    console.error("Failed to create invoice:", error.message);
    return NextResponse.json({ error: `Failed to create invoice: ${error.message}` }, { status: 500 });
  }

  await logActivity({
    userId,
    action: "Created",
    entityType: "invoice",
    entityId: data.id,
    details: { target_name: data.invoice_number, amount: data.amount },
  });

  return NextResponse.json({ invoice: data }, { status: 201 });
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

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("invoices")
    .update(updates)
    .eq("id", id)
    .select(INVOICE_COLUMNS)
    .single();

  if (error) {
    console.error("Failed to update invoice:", error.message);
    return NextResponse.json({ error: "Failed to update invoice" }, { status: 500 });
  }

  await logActivity({
    userId,
    action: "Updated",
    entityType: "invoice",
    entityId: data.id,
    details: { target_name: data.invoice_number, status: data.status },
  });

  return NextResponse.json({ invoice: data });
}

export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const id = normalizeText(body?.id);
  if (!id) return NextResponse.json({ error: "Invoice id required" }, { status: 400 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("invoices")
    .delete()
    .eq("id", id)
    .select("id,invoice_number")
    .single();

  if (error) {
    console.error("Failed to delete invoice:", error.message);
    return NextResponse.json({ error: "Failed to delete invoice" }, { status: 500 });
  }

  await logActivity({
    userId,
    action: "Deleted",
    entityType: "invoice",
    entityId: data.id,
    details: { target_name: data.invoice_number },
  });

  return NextResponse.json({ success: true });
}
