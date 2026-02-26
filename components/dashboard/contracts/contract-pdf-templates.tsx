"use client";

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { ContractType } from "@/lib/contracts/schemas";
import { format } from "date-fns";

// ──────────────────────────────────────────────────────────────────────
// Shared Styles
// ──────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    padding: 48,
    fontFamily: "Helvetica",
    backgroundColor: "#FFFFFF",
    color: "#111111",
    fontSize: 11,
    lineHeight: 1.6,
  },
  header: {
    marginBottom: 28,
    borderBottomWidth: 2,
    borderBottomColor: "#111111",
    paddingBottom: 14,
  },
  title: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: "#111111",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 10,
    color: "#737373",
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#111111",
    marginTop: 20,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  body: {
    fontSize: 11,
    color: "#333333",
    lineHeight: 1.7,
    marginBottom: 8,
  },
  clause: {
    marginBottom: 10,
  },
  clauseNumber: {
    fontFamily: "Helvetica-Bold",
    color: "#111111",
  },
  row: {
    flexDirection: "row",
    gap: 32,
    marginBottom: 10,
  },
  col: {
    flex: 1,
  },
  label: {
    fontSize: 9,
    color: "#737373",
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 3,
  },
  value: {
    fontSize: 11,
    color: "#111111",
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#111111",
    paddingBottom: 4,
    marginBottom: 6,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
    paddingVertical: 5,
  },
  tableCell: {
    flex: 1,
    fontSize: 10,
  },
  tableCellRight: {
    flex: 1,
    fontSize: 10,
    textAlign: "right",
  },
  tableCellSmall: {
    width: 80,
    fontSize: 10,
    textAlign: "right",
  },
  signBlock: {
    marginTop: 48,
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
    paddingTop: 24,
  },
  signRow: {
    flexDirection: "row",
    gap: 40,
  },
  signCol: {
    flex: 1,
  },
  signLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#111111",
    marginBottom: 6,
    height: 28,
  },
  signLabel: {
    fontSize: 9,
    color: "#737373",
  },
  footer: {
    position: "absolute",
    bottom: 28,
    left: 48,
    right: 48,
    fontSize: 8,
    color: "#A3A3A3",
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
    paddingTop: 8,
    textAlign: "center",
  },
  bold: {
    fontFamily: "Helvetica-Bold",
  },
});

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────
function fmtDate(v: unknown): string {
  if (!v || typeof v !== "string") return "_______________";
  try {
    return format(new Date(v), "MMMM d, yyyy");
  } catch {
    return String(v);
  }
}

function fmtCurrency(v: unknown): string {
  const n = Number(v);
  if (isNaN(n)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

function val(data: Record<string, unknown>, key: string, fallback = "_______________"): string {
  const v = data[key];
  if (v === undefined || v === null || v === "") return fallback;
  return String(v);
}

function SignatureBlock({ partyA, partyB, date }: { partyA: string; partyB: string; date: string }) {
  return (
    <View style={s.signBlock}>
      <View style={s.signRow}>
        <View style={s.signCol}>
          <View style={s.signLine} />
          <Text style={s.label}>Authorized Signature — {partyA}</Text>
          <Text style={s.signLabel}>Date: {date}</Text>
        </View>
        <View style={s.signCol}>
          <View style={s.signLine} />
          <Text style={s.label}>Authorized Signature — {partyB}</Text>
          <Text style={s.signLabel}>Date: _______________</Text>
        </View>
      </View>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────
// NDA PDF
// ──────────────────────────────────────────────────────────────────────
function NdaPdf({ data }: { data: Record<string, unknown> }) {
  const today = fmtDate(data.effective_date);
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.title}>Non-Disclosure Agreement</Text>
          <Text style={s.subtitle}>{val(data, "agency_name", "Agency")} &bull; Effective {today}</Text>
        </View>

        {/* Parties */}
        <Text style={s.sectionTitle}>1. Parties</Text>
        <Text style={s.body}>
          This Non-Disclosure Agreement (&quot;Agreement&quot;) is entered into as of {today} by and between:
        </Text>
        <View style={s.row}>
          <View style={s.col}>
            <Text style={s.label}>Disclosing Party</Text>
            <Text style={s.value}>{val(data, "agency_name")}</Text>
            <Text style={{ ...s.value, fontSize: 10, color: "#555" }}>{val(data, "agency_address")}</Text>
            <Text style={{ ...s.value, fontSize: 10, color: "#555" }}>{val(data, "agency_email")}</Text>
          </View>
          <View style={s.col}>
            <Text style={s.label}>Receiving Party</Text>
            <Text style={s.value}>{val(data, "client_name")}</Text>
            <Text style={{ ...s.value, fontSize: 10, color: "#555" }}>{val(data, "client_address")}</Text>
          </View>
        </View>

        {/* Confidential Information */}
        <Text style={s.sectionTitle}>2. Confidential Information</Text>
        <Text style={s.body}>
          &quot;Confidential Information&quot; means any non-public information disclosed by either party to the other, whether orally, in writing, electronically, or by any other means, including but not limited to business strategies, financial data, technical specifications, customer lists, trade secrets, proprietary software, and any other information designated as confidential or that reasonably should be understood to be confidential.
        </Text>

        {/* Obligations */}
        <Text style={s.sectionTitle}>3. Obligations of Receiving Party</Text>
        <Text style={s.body}>
          The Receiving Party agrees to: (a) hold all Confidential Information in strict confidence; (b) not disclose Confidential Information to any third parties without prior written consent; (c) use Confidential Information solely for the purpose of evaluating or engaging in a business relationship between the parties; (d) protect Confidential Information with at least the same degree of care used to protect its own confidential information, but no less than reasonable care.
        </Text>

        {/* Duration */}
        <Text style={s.sectionTitle}>4. Term & Duration</Text>
        <Text style={s.body}>
          This Agreement shall remain in effect for a period of {val(data, "agreement_duration", "2")} year(s) from the Effective Date. The confidentiality obligations shall survive for {val(data, "survival_period", "3")} year(s) after the termination or expiration of this Agreement.
        </Text>

        {/* Exclusions */}
        <Text style={s.sectionTitle}>5. Exclusions</Text>
        <Text style={s.body}>
          Confidential Information does not include information that: (a) is or becomes publicly available through no fault of the Receiving Party; (b) was in the Receiving Party&apos;s possession before disclosure; (c) is independently developed without use of Confidential Information; (d) is lawfully obtained from a third party without restriction.
        </Text>

        {/* Governing Law */}
        <Text style={s.sectionTitle}>6. Governing Law & Disputes</Text>
        <Text style={s.body}>
          This Agreement shall be governed by and construed in accordance with the laws of {val(data, "governing_jurisdiction")}. Any disputes arising under this Agreement shall be resolved in the courts of {val(data, "dispute_jurisdiction")}.
        </Text>

        <SignatureBlock partyA={val(data, "agency_name", "Agency")} partyB={val(data, "client_name", "Client")} date={today} />

        <Text style={s.footer}>
          This document is legally binding upon execution by both parties. Generated by Neura Labs Dashboard.
        </Text>
      </Page>
    </Document>
  );
}

// ──────────────────────────────────────────────────────────────────────
// MSA PDF
// ──────────────────────────────────────────────────────────────────────
function MsaPdf({ data }: { data: Record<string, unknown> }) {
  const today = fmtDate(data.effective_date);
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.title}>Master Service Agreement</Text>
          <Text style={s.subtitle}>{val(data, "agency_name", "Agency")} &bull; Effective {today}</Text>
        </View>

        <Text style={s.sectionTitle}>1. Parties</Text>
        <Text style={s.body}>
          This Master Service Agreement (&quot;Agreement&quot;) is entered into as of {today} by and between {val(data, "agency_name")}, a company registered in {val(data, "registered_jurisdiction")} (&quot;Service Provider&quot;), and {val(data, "client_name")} (&quot;Client&quot;).
        </Text>

        <Text style={s.sectionTitle}>2. Scope of Services</Text>
        <Text style={s.body}>
          The Service Provider shall perform services as described in individual Statements of Work (&quot;SOW&quot;) that may be executed under this Agreement. Each SOW shall reference this Agreement and become a part hereof. In the event of a conflict between this Agreement and any SOW, the terms of this Agreement shall prevail unless the SOW expressly states otherwise.
        </Text>

        <Text style={s.sectionTitle}>3. Payment Terms</Text>
        <Text style={s.body}>
          Unless otherwise specified in a SOW, all invoices are due within {val(data, "invoice_payment_due_days", "14")} days of the invoice date. Late payments shall accrue interest at a rate of {val(data, "late_payment_interest_rate", "1.5")}% per month on the outstanding balance, compounded monthly.
        </Text>

        <Text style={s.sectionTitle}>4. Intellectual Property</Text>
        <Text style={s.body}>
          All intellectual property created by the Service Provider in the course of performing services under this Agreement shall be assigned to the Client upon full payment. The Service Provider retains the right to use general knowledge, skills, and techniques developed during the engagement.
        </Text>

        <Text style={s.sectionTitle}>5. Confidentiality</Text>
        <Text style={s.body}>
          Both parties agree to maintain the confidentiality of any proprietary information exchanged during the engagement. This obligation survives termination of this Agreement.
        </Text>

        <Text style={s.sectionTitle}>6. Termination</Text>
        <Text style={s.body}>
          Either party may terminate this Agreement by providing {val(data, "termination_notice_period", "30")} days&apos; written notice to the other party. Upon termination, the Client shall pay for all services rendered up to the termination date.
        </Text>

        <Text style={s.sectionTitle}>7. Dispute Resolution</Text>
        <Text style={s.body}>
          Any disputes arising from this Agreement shall be resolved through binding arbitration administered by {val(data, "arbitration_body_name")} in {val(data, "arbitration_city_country")}. The arbitration shall be conducted in English, and the decision of the arbitrator(s) shall be final and binding.
        </Text>

        <Text style={s.sectionTitle}>8. Governing Law</Text>
        <Text style={s.body}>
          This Agreement shall be governed by the laws of {val(data, "governing_law_jurisdiction")}, without regard to its conflict of law provisions.
        </Text>

        <Text style={s.sectionTitle}>9. General Provisions</Text>
        <Text style={s.body}>
          This Agreement constitutes the entire agreement between the parties and supersedes all prior negotiations and agreements. No amendment shall be effective unless made in writing and signed by both parties. If any provision is found unenforceable, the remaining provisions shall continue in full force and effect.
        </Text>

        <SignatureBlock partyA={val(data, "agency_name", "Agency")} partyB={val(data, "client_name", "Client")} date={today} />

        <Text style={s.footer}>
          This document is legally binding upon execution by both parties. Generated by Neura Labs Dashboard.
        </Text>
      </Page>
    </Document>
  );
}

// ──────────────────────────────────────────────────────────────────────
// SOW PDF
// ──────────────────────────────────────────────────────────────────────
function SowPdf({ data }: { data: Record<string, unknown> }) {
  const startDate = fmtDate(data.start_date);
  const endDate = fmtDate(data.end_date);
  const deliverables = (data.deliverables as Array<Record<string, unknown>>) ?? [];
  const milestones = (data.milestones as Array<Record<string, unknown>>) ?? [];

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.title}>Statement of Work</Text>
          <Text style={s.subtitle}>{val(data, "agency_name", "Agency")} &bull; {val(data, "project_name", "Project")}</Text>
        </View>

        {/* Overview */}
        <Text style={s.sectionTitle}>1. Project Overview</Text>
        <View style={s.row}>
          <View style={s.col}>
            <Text style={s.label}>Project Name</Text>
            <Text style={s.value}>{val(data, "project_name")}</Text>
          </View>
          <View style={s.col}>
            <Text style={s.label}>Client</Text>
            <Text style={s.value}>{val(data, "client_name")}</Text>
          </View>
        </View>
        <View style={s.row}>
          <View style={s.col}>
            <Text style={s.label}>Start Date</Text>
            <Text style={s.value}>{startDate}</Text>
          </View>
          <View style={s.col}>
            <Text style={s.label}>Estimated Completion</Text>
            <Text style={s.value}>{endDate}</Text>
          </View>
        </View>
        <View style={s.row}>
          <View style={s.col}>
            <Text style={s.label}>Agency Project Manager</Text>
            <Text style={s.value}>{val(data, "pm_name")}</Text>
          </View>
          <View style={s.col}>
            <Text style={s.label}>Client Contact</Text>
            <Text style={s.value}>{val(data, "client_contact")}</Text>
          </View>
        </View>

        {/* Description */}
        <Text style={s.sectionTitle}>2. Project Description</Text>
        <Text style={s.body}>{val(data, "description", "No description provided.")}</Text>

        {/* Deliverables Table */}
        <Text style={s.sectionTitle}>3. Deliverables</Text>
        <View style={s.tableHeader}>
          <Text style={{ ...s.tableCell, fontFamily: "Helvetica-Bold", fontSize: 9, textTransform: "uppercase" as const }}>Deliverable</Text>
          <Text style={{ ...s.tableCellSmall, fontFamily: "Helvetica-Bold", fontSize: 9, textTransform: "uppercase" as const }}>Hours</Text>
          <Text style={{ ...s.tableCellSmall, fontFamily: "Helvetica-Bold", fontSize: 9, textTransform: "uppercase" as const, width: 100 }}>Due Date</Text>
        </View>
        {deliverables.length > 0 ? (
          deliverables.map((d, i) => (
            <View key={i} style={s.tableRow}>
              <Text style={s.tableCell}>{String(d.name ?? "")}</Text>
              <Text style={s.tableCellSmall}>{String(d.hours ?? "")}</Text>
              <Text style={{ ...s.tableCellSmall, width: 100 }}>{fmtDate(d.due_date)}</Text>
            </View>
          ))
        ) : (
          <Text style={s.body}>No deliverables specified.</Text>
        )}

        {/* Payment */}
        <Text style={s.sectionTitle}>4. Payment Schedule</Text>
        <View style={s.row}>
          <View style={s.col}>
            <Text style={s.label}>Kickoff Deposit</Text>
            <Text style={s.value}>{fmtCurrency(data.deposit_amount)}</Text>
          </View>
          <View style={s.col}>
            <Text style={s.label}>Final Payment</Text>
            <Text style={s.value}>{fmtCurrency(data.final_payment)}</Text>
          </View>
        </View>

        {milestones.length > 0 && (
          <>
            <Text style={{ ...s.label, marginTop: 8, marginBottom: 4 }}>Milestones</Text>
            <View style={s.tableHeader}>
              <Text style={{ ...s.tableCell, fontFamily: "Helvetica-Bold", fontSize: 9, textTransform: "uppercase" as const }}>Milestone</Text>
              <Text style={{ ...s.tableCellSmall, fontFamily: "Helvetica-Bold", fontSize: 9, textTransform: "uppercase" as const }}>Amount</Text>
              <Text style={{ ...s.tableCellSmall, fontFamily: "Helvetica-Bold", fontSize: 9, textTransform: "uppercase" as const, width: 100 }}>Due Date</Text>
            </View>
            {milestones.map((m, i) => (
              <View key={i} style={s.tableRow}>
                <Text style={s.tableCell}>{String(m.description ?? "")}</Text>
                <Text style={s.tableCellSmall}>{fmtCurrency(m.amount)}</Text>
                <Text style={{ ...s.tableCellSmall, width: 100 }}>{fmtDate(m.date)}</Text>
              </View>
            ))}
          </>
        )}

        <View style={{ ...s.row, marginTop: 12, borderTopWidth: 1, borderTopColor: "#111", paddingTop: 8 }}>
          <View style={s.col}>
            <Text style={{ ...s.label, fontSize: 11 }}>Total Project Fee</Text>
          </View>
          <View style={s.col}>
            <Text style={{ ...s.value, fontFamily: "Helvetica-Bold", fontSize: 14, textAlign: "right" }}>{fmtCurrency(data.total_fee)}</Text>
          </View>
        </View>

        {/* Terms */}
        <Text style={s.sectionTitle}>5. Acceptance & Terms</Text>
        <Text style={s.body}>
          The Client shall review each deliverable and provide written acceptance or detailed feedback within {val(data, "acceptance_period", "5")} business days of delivery. Failure to respond within this period shall constitute acceptance. Scope changes must be agreed upon in writing and may be subject to additional fees and timeline adjustments.
        </Text>

        <SignatureBlock partyA={val(data, "agency_name", "Agency")} partyB={val(data, "client_name", "Client")} date={startDate} />

        <Text style={s.footer}>
          This document is legally binding upon execution by both parties. Generated by Neura Labs Dashboard.
        </Text>
      </Page>
    </Document>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Retainer PDF
// ──────────────────────────────────────────────────────────────────────
function RetainerPdf({ data }: { data: Record<string, unknown> }) {
  const startDate = fmtDate(data.start_date);
  const serviceCategories = [
    data.service_category_1,
    data.service_category_2,
    data.service_category_3,
    data.service_category_4,
  ].filter(Boolean);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <Text style={s.title}>Retainer Agreement</Text>
          <Text style={s.subtitle}>{val(data, "agency_name", "Agency")} &bull; Effective {startDate}</Text>
        </View>

        <Text style={s.sectionTitle}>1. Parties</Text>
        <Text style={s.body}>
          This Retainer Agreement (&quot;Agreement&quot;) is entered into as of {startDate} by and between {val(data, "agency_name")} (&quot;Service Provider&quot;) and {val(data, "client_name")} (&quot;Client&quot;).
        </Text>

        <Text style={s.sectionTitle}>2. Service Scope</Text>
        <Text style={s.body}>
          The Service Provider shall provide the following categories of services under this retainer:
        </Text>
        {serviceCategories.map((cat, i) => (
          <Text key={i} style={{ ...s.body, marginLeft: 16, marginBottom: 2 }}>
            {i + 1}. {String(cat)}
          </Text>
        ))}
        <Text style={{ ...s.body, marginTop: 8 }}>
          The Client is allocated {val(data, "monthly_hours")} hours per month. Unused hours do not roll over to subsequent months.
        </Text>

        <Text style={s.sectionTitle}>3. Financial Terms</Text>
        <View style={s.row}>
          <View style={s.col}>
            <Text style={s.label}>Monthly Retainer Fee</Text>
            <Text style={s.value}>{fmtCurrency(data.monthly_fee)}</Text>
          </View>
          <View style={s.col}>
            <Text style={s.label}>Overtime Hourly Rate</Text>
            <Text style={s.value}>{fmtCurrency(data.overtime_rate)}</Text>
          </View>
        </View>
        <Text style={s.body}>
          Invoices shall be issued on day {val(data, "invoice_day", "1")} of each month and are due within {val(data, "payment_due_days", "7")} days. Payment shall be made via {val(data, "payment_method", "Bank Transfer")}. Work performed beyond the allocated monthly hours shall be billed at the overtime hourly rate.
        </Text>

        <Text style={s.sectionTitle}>4. Term & Termination</Text>
        <Text style={s.body}>
          This Agreement commences on {startDate} and shall continue on a month-to-month basis until terminated by either party with {val(data, "termination_notice", "30")} days&apos; written notice. Upon termination, the Client shall pay for all services rendered up to the termination date, including any accrued overtime.
        </Text>

        <Text style={s.sectionTitle}>5. Non-Solicitation</Text>
        <Text style={s.body}>
          During the term of this Agreement and for {val(data, "non_solicitation_period", "12")} months thereafter, neither party shall directly or indirectly solicit, recruit, or hire any employee, contractor, or agent of the other party without prior written consent.
        </Text>

        <Text style={s.sectionTitle}>6. Service Level & Reporting</Text>
        <Text style={s.body}>
          The Service Provider commits to a response SLA of {val(data, "response_sla", "1 Business Day")} for all client communications. A detailed monthly activity report shall be delivered by business day {val(data, "monthly_report_due", "5")} of the following month, itemizing hours spent per service category.
        </Text>

        <Text style={s.sectionTitle}>7. General Provisions</Text>
        <Text style={s.body}>
          This Agreement constitutes the entire agreement between the parties regarding the subject matter hereof. No modification shall be effective unless in writing and signed by both parties. This Agreement shall be governed by applicable local law.
        </Text>

        <SignatureBlock partyA={val(data, "agency_name", "Agency")} partyB={val(data, "client_name", "Client")} date={startDate} />

        <Text style={s.footer}>
          This document is legally binding upon execution by both parties. Generated by Neura Labs Dashboard.
        </Text>
      </Page>
    </Document>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Export — dispatch to the right template
// ──────────────────────────────────────────────────────────────────────
export function ContractPdfDocument({
  type,
  data,
}: {
  type: ContractType;
  data: Record<string, unknown>;
}) {
  switch (type) {
    case "NDA":
      return <NdaPdf data={data} />;
    case "MSA":
      return <MsaPdf data={data} />;
    case "SOW":
      return <SowPdf data={data} />;
    case "RETAINER":
      return <RetainerPdf data={data} />;
    default:
      return <NdaPdf data={data} />;
  }
}
