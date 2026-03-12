import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { queryDocs, getDoc, insertDoc, updateDoc, deleteDoc, serializeDoc } from "@/lib/firebase/db";
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
  return isFinite(n) && n > 0 ? n : null;
}

async function enrichPayment(doc: Record<string, unknown>) {
  // Build nested invoices shape for backwards-compat
  if (doc.invoice_id) {
    const invoice = await getDoc("invoices", doc.invoice_id as string);
    if (invoice) {
      let client_name: string | null = null;
      if (invoice.client_id) {
        const client = await getDoc("clients", invoice.client_id as string);
        if (client) client_name = client.company_name as string;
      }
      doc.invoices = {
        invoice_number: invoice.invoice_number,
        amount: invoice.amount,
        clients: client_name ? { company_name: client_name } : null,
      };
    }
  }
  return doc;
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data = await queryDocs("payments", [], [{ field: "created_at", direction: "desc" }]);
    const enriched = await Promise.all(data.map(async (d) => enrichPayment(serializeDoc(d))));
    return NextResponse.json({ payments: enriched });
  } catch (error) {
    console.error("Failed to fetch payments:", error);
    return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const invoice_id = normalizeText(body?.invoice_id);
  if (!invoice_id) return NextResponse.json({ error: "Invoice is required" }, { status: 400 });

  const amount = normalizeNumber(body?.amount);
  if (!amount) return NextResponse.json({ error: "Valid amount is required" }, { status: 400 });

  const payload: Record<string, unknown> = { invoice_id, amount };
  const payment_date = normalizeDate(body?.payment_date);
  if (payment_date) payload.payment_date = payment_date;
  const payment_method = normalizeText(body?.payment_method);
  if (payment_method) payload.payment_method = payment_method;
  const notes = normalizeText(body?.notes);
  if (notes) payload.notes = notes;

  try {
    const paymentRow = await insertDoc("payments", payload);
    const enriched = await enrichPayment(serializeDoc(paymentRow));

    const invoiceNumber = (enriched.invoices as Record<string, unknown>)?.invoice_number;
    await logActivity({
      userId,
      action: "Recorded",
      entityType: "payment",
      entityId: paymentRow.id,
      details: {
        target_name: (invoiceNumber as string) ?? `Payment ${paymentRow.id.slice(0, 8)}`,
        amount: paymentRow.amount,
      },
    });

    // Auto-update invoice status
    const invoice = await getDoc("invoices", invoice_id);
    if (invoice) {
      const allPayments = await queryDocs("payments", [{ field: "invoice_id", op: "==", value: invoice_id }]);
      const totalPaid = allPayments.reduce((sum, p) => sum + Number(p.amount), 0);
      const invoiceAmount = Number(invoice.amount);
      const newStatus = totalPaid >= invoiceAmount ? "Paid" : "Partial";
      await updateDoc("invoices", invoice_id, { status: newStatus });
    }

    return NextResponse.json({ payment: enriched }, { status: 201 });
  } catch (error) {
    console.error("Failed to record payment:", error);
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const id = normalizeText(body?.id);
  if (!id) return NextResponse.json({ error: "Payment id required" }, { status: 400 });

  try {
    const payment = await getDoc("payments", id);
    if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });

    await deleteDoc("payments", id);

    await logActivity({
      userId,
      action: "Deleted",
      entityType: "payment",
      entityId: id,
      details: { target_name: `Payment ${id.slice(0, 8)}`, invoice_id: payment.invoice_id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete payment:", error);
    return NextResponse.json({ error: "Failed to delete payment" }, { status: 500 });
  }
}
