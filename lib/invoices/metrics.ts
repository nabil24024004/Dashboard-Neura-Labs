export type InvoiceStatus = "Draft" | "Pending" | "Paid" | "Overdue" | "Partial";

export interface InvoiceSnapshot {
  id: string;
  amount: number;
  status: InvoiceStatus | null | undefined;
  due_date: string | null | undefined;
  issue_date?: string | null | undefined;
  created_at?: string | null | undefined;
}

export interface PaymentSnapshot {
  id: string;
  amount: number;
  payment_date?: string | null | undefined;
  created_at?: string | null | undefined;
  invoice_id?: string | null | undefined;
}

export interface InvoiceStateSummary {
  openInvoiceCount: number;
  overdueInvoiceCount: number;
  openInvoiceAmount: number;
  paidInvoiceAmount: number;
  settlementRate: number;
}

export interface CashFlowSummary {
  collectedAllTime: number;
  collectedCurrentMonth: number;
  collectedPreviousMonth: number;
}

export interface FinanceDashboardMetrics {
  invoiceState: InvoiceStateSummary;
  cashFlow: CashFlowSummary;
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeInvoiceStatus(value: InvoiceSnapshot["status"]): InvoiceStatus {
  switch (value) {
    case "Pending":
    case "Paid":
    case "Overdue":
    case "Partial":
    case "Draft":
      return value;
    default:
      return "Draft";
  }
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getEffectiveInvoiceStatus(invoice: InvoiceSnapshot, now: Date): InvoiceStatus {
  const status = normalizeInvoiceStatus(invoice.status);
  if (status === "Paid" || status === "Draft" || status === "Overdue") {
    return status;
  }

  const dueDate = parseDate(invoice.due_date);
  if (!dueDate) return status;

  return startOfDay(dueDate) < startOfDay(now) ? "Overdue" : status;
}

export function isOpenReceivable(status: InvoiceStatus): boolean {
  return status === "Pending" || status === "Partial" || status === "Overdue";
}

export function summarizeInvoiceState(invoices: InvoiceSnapshot[], now: Date): InvoiceStateSummary {
  let openInvoiceCount = 0;
  let overdueInvoiceCount = 0;
  let openInvoiceAmount = 0;
  let paidInvoiceAmount = 0;
  let totalNonDraftInvoiced = 0;

  for (const invoice of invoices) {
    const status = getEffectiveInvoiceStatus(invoice, now);
    const amount = Number(invoice.amount) || 0;

    if (status !== "Draft") {
      totalNonDraftInvoiced += amount;
    }

    if (status === "Paid") {
      paidInvoiceAmount += amount;
    }

    if (isOpenReceivable(status)) {
      openInvoiceCount += 1;
      openInvoiceAmount += amount;
    }

    if (status === "Overdue") {
      overdueInvoiceCount += 1;
    }
  }

  return {
    openInvoiceCount,
    overdueInvoiceCount,
    openInvoiceAmount,
    paidInvoiceAmount,
    settlementRate: totalNonDraftInvoiced === 0 ? 0 : (paidInvoiceAmount / totalNonDraftInvoiced) * 100,
  };
}

export function summarizeCashFlow(payments: PaymentSnapshot[], now: Date): CashFlowSummary {
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  let collectedAllTime = 0;
  let collectedCurrentMonth = 0;
  let collectedPreviousMonth = 0;

  for (const payment of payments) {
    const amount = Number(payment.amount) || 0;
    collectedAllTime += amount;

    const paymentDate = parseDate(payment.payment_date || payment.created_at);
    if (!paymentDate) continue;

    if (paymentDate >= currentMonthStart) {
      collectedCurrentMonth += amount;
    } else if (paymentDate >= previousMonthStart && paymentDate < currentMonthStart) {
      collectedPreviousMonth += amount;
    }
  }

  return {
    collectedAllTime,
    collectedCurrentMonth,
    collectedPreviousMonth,
  };
}

export function buildFinanceDashboardMetrics({
  invoices,
  payments,
  now,
}: {
  invoices: InvoiceSnapshot[];
  payments: PaymentSnapshot[];
  now: Date;
}): FinanceDashboardMetrics {
  return {
    invoiceState: summarizeInvoiceState(invoices, now),
    cashFlow: summarizeCashFlow(payments, now),
  };
}
