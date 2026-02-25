import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";

const PAYMENT_COLUMNS =
  "id,invoice_id,amount,payment_date,payment_method,notes,created_at,invoices(invoice_number,amount,clients(company_name))";

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
  return isFinite(n) && n > 0 ? n : null;
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("payments")
    .select(PAYMENT_COLUMNS)
    .order("payment_date", { ascending: false });

  if (error) {
    console.error("Failed to fetch payments:", error.message);
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }

  return NextResponse.json({ payments: data ?? [] });
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const invoice_id = normalizeText(body?.invoice_id);
  if (!invoice_id) return NextResponse.json({ error: "Invoice is required" }, { status: 400 });

  const amount = normalizeNumber(body?.amount);
  if (!amount) return NextResponse.json({ error: "Valid amount is required" }, { status: 400 });

  const supabase = createAdminClient();

  const payload: Record<string, unknown> = { invoice_id, amount };
  const payment_date = normalizeDate(body?.payment_date);
  if (payment_date) payload.payment_date = payment_date;
  const payment_method = normalizeText(body?.payment_method);
  if (payment_method) payload.payment_method = payment_method;
  const notes = normalizeText(body?.notes);
  if (notes) payload.notes = notes;

  const { data: paymentRow, error: payError } = await supabase
    .from("payments")
    .insert(payload)
    .select(PAYMENT_COLUMNS)
    .single();

  if (payError) {
    console.error("Failed to record payment:", payError.message);
    return NextResponse.json({ error: `Failed to record payment: ${payError.message}` }, { status: 500 });
  }

  // Auto-update invoice status: sum all payments for this invoice; if >= invoice amount → Paid, else → Partial
  const { data: invoice } = await supabase
    .from("invoices")
    .select("amount")
    .eq("id", invoice_id)
    .single();

  if (invoice) {
    const { data: allPayments } = await supabase
      .from("payments")
      .select("amount")
      .eq("invoice_id", invoice_id);

    const totalPaid = (allPayments ?? []).reduce((sum, p) => sum + Number(p.amount), 0);
    const invoiceAmount = Number(invoice.amount);
    const newStatus = totalPaid >= invoiceAmount ? "Paid" : "Partial";

    await supabase
      .from("invoices")
      .update({ status: newStatus })
      .eq("id", invoice_id);
  }

  return NextResponse.json({ payment: paymentRow }, { status: 201 });
}

export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const id = normalizeText(body?.id);
  if (!id) return NextResponse.json({ error: "Payment id required" }, { status: 400 });

  const supabase = createAdminClient();
  const { error } = await supabase.from("payments").delete().eq("id", id);

  if (error) {
    console.error("Failed to delete payment:", error.message);
    return NextResponse.json({ error: "Failed to delete payment" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
