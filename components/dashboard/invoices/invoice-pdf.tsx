"use client";

import dynamic from "next/dynamic";
import { Invoice } from "./invoices-columns";
import { Download } from "lucide-react";
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";

const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
  {
    ssr: false,
    loading: () => <span className="text-[#737373] text-sm flex items-center"><Download className="h-4 w-4 mr-2" /> Preparing PDF...</span>,
  }
);

// Create styles for PDF
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
    color: "#0A0A0A",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 40,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
    paddingBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  logoPlaceholder: {
    width: 40,
    height: 40,
    backgroundColor: "#0A0A0A",
    borderRadius: 8,
  },
  section: {
    marginBottom: 30,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  label: {
    fontSize: 10,
    color: "#737373",
    textTransform: "uppercase",
  },
  value: {
    fontSize: 12,
    fontWeight: "bold",
  },
  table: {
    marginTop: 20,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
    paddingBottom: 5,
    marginBottom: 10,
  },
  tableCol: {
    flex: 1,
  },
  tableColRight: {
    flex: 1,
    textAlign: "right",
  },
  tableRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  footer: {
    marginTop: 50,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  totalText: {
    fontSize: 16,
    fontWeight: "bold",
  },
});

const InvoiceDocument = ({ invoice }: { invoice: Invoice }) => {
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(invoice.amount);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <View style={styles.logoPlaceholder} />
            <Text style={{ marginTop: 10, fontSize: 14, fontWeight: "bold" }}>Neura Labs</Text>
            <Text style={{ fontSize: 10, color: "#737373", marginTop: 4 }}>123 Innovation Drive</Text>
            <Text style={{ fontSize: 10, color: "#737373" }}>Tech City, TX 78701</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.title}>INVOICE</Text>
            <Text style={{ fontSize: 12, marginTop: 4 }}>#{invoice.invoice_number}</Text>
          </View>
        </View>

        <View style={styles.row}>
          <View>
            <Text style={styles.label}>Bill To:</Text>
            <Text style={styles.value}>{invoice.client_name}</Text>
            <Text style={{ fontSize: 10, color: "#737373", marginTop: 4 }}>Client Address (Placeholder)</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <View style={{ marginBottom: 10, alignItems: "flex-end" }}>
              <Text style={styles.label}>Issue Date:</Text>
              <Text style={styles.value}>{new Date(invoice.issue_date).toLocaleDateString()}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.label}>Due Date:</Text>
              <Text style={styles.value}>{new Date(invoice.due_date).toLocaleDateString()}</Text>
            </View>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <View style={styles.tableCol}><Text style={styles.label}>Description</Text></View>
            <View style={styles.tableColRight}><Text style={styles.label}>Amount</Text></View>
          </View>
          
          <View style={styles.tableRow}>
            <View style={styles.tableCol}><Text style={{ fontSize: 12 }}>Standard Service Provision</Text></View>
            <View style={styles.tableColRight}><Text style={{ fontSize: 12 }}>{formattedAmount}</Text></View>
          </View>
        </View>

        <View style={styles.footer}>
          <View>
             <Text style={styles.label}>Payment Terms</Text>
             <Text style={{ fontSize: 10, marginTop: 4 }}>Please pay within 15 days of receiving this invoice.</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
             <Text style={styles.label}>Total Due</Text>
             <Text style={styles.totalText}>{formattedAmount}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export function InvoicePdfDownload({ invoice }: { invoice: Invoice }) {
  return (
    <div className="flex items-center w-full" onClick={(e) => e.stopPropagation()}>
      <PDFDownloadLink
        document={<InvoiceDocument invoice={invoice} />}
        fileName={`invoice-${invoice.invoice_number}.pdf`}
        className="flex items-center w-full"
      >
        {({ loading }) =>
          loading ? (
            <span className="text-[#737373] text-sm flex items-center">
              <Download className="h-4 w-4 mr-2" /> Preparing PDF...
            </span>
          ) : (
            <span className="flex items-center w-full">
              <Download className="h-4 w-4 mr-2" /> Download PDF
            </span>
          )
        }
      </PDFDownloadLink>
    </div>
  );
}
