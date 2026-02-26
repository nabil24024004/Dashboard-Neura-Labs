// ──────────────────────────────────────────────────────────────────────
// Contract Type Schemas — drives the entire wizard UI dynamically.
// To add a new contract type, define a new schema here. No UI changes needed.
// ──────────────────────────────────────────────────────────────────────

export type ContractType = "NDA" | "MSA" | "SOW" | "RETAINER";

export type FieldType =
  | "text"
  | "textarea"
  | "email"
  | "date"
  | "number"
  | "currency"
  | "select"
  | "repeatable";

export interface ContractField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  defaultValue?: string | number;
  tooltip?: string;
  placeholder?: string;
  options?: string[]; // for select fields
  suffix?: string; // e.g. "days", "years", "%"
  repeatableFields?: ContractField[]; // nested fields for repeatable rows
  min?: number;
}

export interface ContractSection {
  id: string;
  title: string;
  description?: string;
  fields: ContractField[];
}

export interface ContractTypeSchema {
  id: ContractType;
  name: string;
  description: string;
  iconName: string; // lucide icon name mapped in UI
  sections: ContractSection[];
}

// ──────────────────────────────────────────────────────────────────────
// NDA Schema — 10 placeholders, 2 sections
// ──────────────────────────────────────────────────────────────────────
const ndaSchema: ContractTypeSchema = {
  id: "NDA",
  name: "Non-Disclosure Agreement",
  description:
    "Protect confidential information shared between parties during a business relationship.",
  iconName: "ShieldCheck",
  sections: [
    {
      id: "nda-parties",
      title: "Parties & Dates",
      description: "Identify both parties and the effective date.",
      fields: [
        {
          key: "agency_name",
          label: "Agency Name",
          type: "text",
          required: true,
          defaultValue: "Neura Labs",
          placeholder: "Your agency name",
        },
        {
          key: "agency_address",
          label: "Agency Address",
          type: "textarea",
          required: true,
          placeholder: "123 Innovation Drive, Tech City, TX 78701",
        },
        {
          key: "agency_email",
          label: "Agency Email",
          type: "email",
          required: true,
          placeholder: "contracts@neuralabs.com",
        },
        {
          key: "client_name",
          label: "Client Full Name / Company",
          type: "text",
          required: true,
          placeholder: "Acme Corporation",
        },
        {
          key: "client_address",
          label: "Client Address",
          type: "textarea",
          required: true,
          placeholder: "456 Business Ave, Suite 200",
        },
        {
          key: "effective_date",
          label: "Effective Date",
          type: "date",
          required: true,
        },
      ],
    },
    {
      id: "nda-terms",
      title: "Agreement Terms",
      description: "Define the confidentiality terms and governing law.",
      fields: [
        {
          key: "agreement_duration",
          label: "Agreement Duration",
          type: "number",
          required: true,
          defaultValue: 2,
          suffix: "years",
          tooltip: "How long the NDA remains in effect.",
          min: 1,
        },
        {
          key: "survival_period",
          label: "Survival Period After Disclosure",
          type: "number",
          required: true,
          defaultValue: 3,
          suffix: "years",
          tooltip:
            "How long confidentiality obligations survive after the agreement ends.",
          min: 1,
        },
        {
          key: "governing_jurisdiction",
          label: "Governing Jurisdiction",
          type: "text",
          required: true,
          placeholder: "State of Texas, United States",
          tooltip: "The jurisdiction whose laws govern this agreement.",
        },
        {
          key: "dispute_jurisdiction",
          label: "Dispute Resolution Jurisdiction",
          type: "text",
          required: true,
          placeholder: "Austin, Texas",
          tooltip: "Where disputes will be resolved.",
        },
      ],
    },
  ],
};

// ──────────────────────────────────────────────────────────────────────
// MSA Schema — 10 placeholders, 3 sections
// ──────────────────────────────────────────────────────────────────────
const msaSchema: ContractTypeSchema = {
  id: "MSA",
  name: "Master Service Agreement",
  description:
    "Establish general terms governing the ongoing service relationship between parties.",
  iconName: "Handshake",
  sections: [
    {
      id: "msa-parties",
      title: "Parties & Dates",
      description: "Identify the service provider and client.",
      fields: [
        {
          key: "agency_name",
          label: "Agency Name",
          type: "text",
          required: true,
          defaultValue: "Neura Labs",
          placeholder: "Your agency name",
        },
        {
          key: "registered_jurisdiction",
          label: "Registered Jurisdiction (Agency)",
          type: "text",
          required: true,
          placeholder: "State of Delaware, United States",
        },
        {
          key: "client_name",
          label: "Client Name / Company",
          type: "text",
          required: true,
          placeholder: "Acme Corporation",
        },
        {
          key: "effective_date",
          label: "Effective Date",
          type: "date",
          required: true,
        },
      ],
    },
    {
      id: "msa-commercial",
      title: "Commercial Terms",
      description: "Payment and invoicing conditions.",
      fields: [
        {
          key: "invoice_payment_due_days",
          label: "Invoice Payment Due",
          type: "number",
          required: true,
          defaultValue: 14,
          suffix: "days",
          tooltip:
            "Number of days after invoice date that payment is due.",
          min: 1,
        },
        {
          key: "late_payment_interest_rate",
          label: "Late Payment Interest Rate",
          type: "number",
          required: true,
          defaultValue: 1.5,
          suffix: "% per month",
          tooltip:
            "Monthly interest rate applied to overdue invoices.",
        },
      ],
    },
    {
      id: "msa-legal",
      title: "Legal Terms",
      description: "Termination, arbitration, and governing law.",
      fields: [
        {
          key: "termination_notice_period",
          label: "Termination Notice Period",
          type: "number",
          required: true,
          defaultValue: 30,
          suffix: "days",
          min: 1,
        },
        {
          key: "arbitration_city_country",
          label: "Arbitration City & Country",
          type: "text",
          required: true,
          placeholder: "New York, United States",
        },
        {
          key: "arbitration_body_name",
          label: "Arbitration Body Name",
          type: "text",
          required: true,
          placeholder: "American Arbitration Association",
        },
        {
          key: "governing_law_jurisdiction",
          label: "Governing Law Jurisdiction",
          type: "text",
          required: true,
          placeholder: "State of New York, United States",
        },
      ],
    },
  ],
};

// ──────────────────────────────────────────────────────────────────────
// SOW Schema — most complex, 5 sections with repeatable rows
// ──────────────────────────────────────────────────────────────────────
const sowSchema: ContractTypeSchema = {
  id: "SOW",
  name: "Statement of Work",
  description:
    "Define project deliverables, timelines, milestones, and payment terms.",
  iconName: "ClipboardList",
  sections: [
    {
      id: "sow-project",
      title: "Project Details",
      description: "Basic project and contact information.",
      fields: [
        {
          key: "project_name",
          label: "Project Name",
          type: "text",
          required: true,
          placeholder: "Website Redesign",
        },
        {
          key: "client_name",
          label: "Client Name / Company",
          type: "text",
          required: true,
          placeholder: "Acme Corporation",
        },
        {
          key: "agency_name",
          label: "Agency Name",
          type: "text",
          required: true,
          defaultValue: "Neura Labs",
        },
        {
          key: "start_date",
          label: "Project Start Date",
          type: "date",
          required: true,
        },
        {
          key: "end_date",
          label: "Estimated Completion Date",
          type: "date",
          required: true,
        },
        {
          key: "pm_name",
          label: "Agency Project Manager",
          type: "text",
          required: true,
          placeholder: "John Smith",
        },
        {
          key: "client_contact",
          label: "Client Primary Contact (Name & Email)",
          type: "text",
          required: true,
          placeholder: "Jane Doe (jane@acme.com)",
        },
      ],
    },
    {
      id: "sow-description",
      title: "Project Description",
      description: "Describe the scope and objectives of the project.",
      fields: [
        {
          key: "description",
          label: "Project Description",
          type: "textarea",
          required: true,
          placeholder:
            "Describe the project scope, objectives, and key requirements...",
        },
      ],
    },
    {
      id: "sow-deliverables",
      title: "Deliverables",
      description:
        "Add each deliverable with estimated hours and due date. At least one is required.",
      fields: [
        {
          key: "deliverables",
          label: "Deliverables",
          type: "repeatable",
          required: true,
          repeatableFields: [
            {
              key: "name",
              label: "Deliverable Name",
              type: "text",
              required: true,
              placeholder: "Homepage Design",
            },
            {
              key: "hours",
              label: "Estimated Hours",
              type: "number",
              required: true,
              min: 1,
            },
            {
              key: "due_date",
              label: "Due Date",
              type: "date",
              required: true,
            },
          ],
        },
      ],
    },
    {
      id: "sow-financial",
      title: "Financial",
      description: "Payment schedule including deposits, milestones, and final payment.",
      fields: [
        {
          key: "deposit_amount",
          label: "Kickoff Deposit",
          type: "currency",
          required: true,
          placeholder: "5000",
          tooltip: "Amount due before project work begins.",
        },
        {
          key: "milestones",
          label: "Payment Milestones",
          type: "repeatable",
          repeatableFields: [
            {
              key: "description",
              label: "Milestone Description",
              type: "text",
              required: true,
              placeholder: "Design approval",
            },
            {
              key: "amount",
              label: "Amount (USD)",
              type: "currency",
              required: true,
            },
            {
              key: "date",
              label: "Due Date",
              type: "date",
              required: true,
            },
          ],
        },
        {
          key: "final_payment",
          label: "Final Payment",
          type: "currency",
          required: true,
          placeholder: "5000",
        },
        {
          key: "total_fee",
          label: "Total Project Fee",
          type: "currency",
          required: true,
          placeholder: "30000",
          tooltip:
            "The total fee for the project. Should equal deposit + milestones + final payment.",
        },
      ],
    },
    {
      id: "sow-terms",
      title: "Terms",
      description: "Acceptance and review period.",
      fields: [
        {
          key: "acceptance_period",
          label: "Acceptance Period",
          type: "number",
          required: true,
          defaultValue: 5,
          suffix: "business days",
          tooltip:
            "Business days the client has to review and accept each deliverable.",
          min: 1,
        },
      ],
    },
  ],
};

// ──────────────────────────────────────────────────────────────────────
// Retainer Schema — 4 sections
// ──────────────────────────────────────────────────────────────────────
const retainerSchema: ContractTypeSchema = {
  id: "RETAINER",
  name: "Retainer Agreement",
  description:
    "Secure ongoing access to agency services on a recurring monthly basis.",
  iconName: "RefreshCcw",
  sections: [
    {
      id: "ret-parties",
      title: "Parties & Dates",
      description: "Identify both parties and the start date.",
      fields: [
        {
          key: "agency_name",
          label: "Agency Name",
          type: "text",
          required: true,
          defaultValue: "Neura Labs",
          placeholder: "Your agency name",
        },
        {
          key: "client_name",
          label: "Client Name / Company",
          type: "text",
          required: true,
          placeholder: "Acme Corporation",
        },
        {
          key: "start_date",
          label: "Effective / Start Date",
          type: "date",
          required: true,
        },
      ],
    },
    {
      id: "ret-scope",
      title: "Service Scope",
      description: "Define the categories of work and monthly allocation.",
      fields: [
        {
          key: "service_category_1",
          label: "Service Category 1",
          type: "text",
          required: true,
          placeholder: "Feature Development",
        },
        {
          key: "service_category_2",
          label: "Service Category 2",
          type: "text",
          placeholder: "Bug Fixes & Maintenance",
        },
        {
          key: "service_category_3",
          label: "Service Category 3",
          type: "text",
          placeholder: "UI/UX Design",
        },
        {
          key: "service_category_4",
          label: "Service Category 4",
          type: "text",
          placeholder: "Technical Consulting",
        },
        {
          key: "monthly_hours",
          label: "Monthly Hours Allocation",
          type: "number",
          required: true,
          placeholder: "80",
          min: 1,
        },
      ],
    },
    {
      id: "ret-financial",
      title: "Financial",
      description: "Fees, invoicing schedule, and payment method.",
      fields: [
        {
          key: "monthly_fee",
          label: "Monthly Retainer Fee",
          type: "currency",
          required: true,
          placeholder: "10000",
        },
        {
          key: "overtime_rate",
          label: "Overtime Hourly Rate",
          type: "currency",
          required: true,
          placeholder: "150",
        },
        {
          key: "invoice_day",
          label: "Invoice Day of Month",
          type: "number",
          required: true,
          defaultValue: 1,
          tooltip: "Day of the month the invoice is issued.",
          min: 1,
        },
        {
          key: "payment_due_days",
          label: "Payment Due After Invoice",
          type: "number",
          required: true,
          defaultValue: 7,
          suffix: "days",
          min: 1,
        },
        {
          key: "payment_method",
          label: "Payment Method",
          type: "select",
          required: true,
          options: ["Bank Transfer", "Stripe", "PayPal", "Wire Transfer"],
          defaultValue: "Bank Transfer",
        },
      ],
    },
    {
      id: "ret-terms",
      title: "Terms & Conditions",
      description: "Termination, non-solicitation, and SLA terms.",
      fields: [
        {
          key: "termination_notice",
          label: "Termination Notice Period",
          type: "number",
          required: true,
          defaultValue: 30,
          suffix: "days",
          min: 1,
        },
        {
          key: "non_solicitation_period",
          label: "Non-Solicitation Period",
          type: "number",
          required: true,
          defaultValue: 12,
          suffix: "months",
          min: 1,
        },
        {
          key: "response_sla",
          label: "Response SLA",
          type: "text",
          required: true,
          defaultValue: "1 Business Day",
          placeholder: "1 Business Day",
        },
        {
          key: "monthly_report_due",
          label: "Monthly Report Due Day",
          type: "number",
          required: true,
          defaultValue: 5,
          tooltip:
            "Business day of the following month by which the monthly report is delivered.",
          min: 1,
        },
      ],
    },
  ],
};

// ──────────────────────────────────────────────────────────────────────
// Exports
// ──────────────────────────────────────────────────────────────────────

export const CONTRACT_SCHEMAS: Record<ContractType, ContractTypeSchema> = {
  NDA: ndaSchema,
  MSA: msaSchema,
  SOW: sowSchema,
  RETAINER: retainerSchema,
};

export const CONTRACT_TYPES = Object.values(CONTRACT_SCHEMAS);

/** Build default form values for a given contract type */
export function getDefaultValues(
  type: ContractType
): Record<string, unknown> {
  const schema = CONTRACT_SCHEMAS[type];
  const defaults: Record<string, unknown> = {};

  for (const section of schema.sections) {
    for (const field of section.fields) {
      if (field.type === "repeatable") {
        defaults[field.key] = [];
      } else if (field.defaultValue !== undefined) {
        defaults[field.key] = field.defaultValue;
      } else {
        defaults[field.key] = "";
      }
    }
  }

  return defaults;
}

/** Generate a contract title from type and client name */
export function generateContractTitle(
  type: ContractType,
  clientName: string
): string {
  const now = new Date();
  const month = now.toLocaleString("en-US", { month: "short" });
  const year = now.getFullYear();
  const typeName = CONTRACT_SCHEMAS[type].name;
  return `${typeName} — ${clientName || "Unnamed"} — ${month} ${year}`;
}

/** Validate form values against a schema, returns array of error messages */
export function validateContractForm(
  type: ContractType,
  values: Record<string, unknown>
): string[] {
  const schema = CONTRACT_SCHEMAS[type];
  const errors: string[] = [];

  for (const section of schema.sections) {
    for (const field of section.fields) {
      if (!field.required) continue;

      const val = values[field.key];

      if (field.type === "repeatable") {
        const arr = val as unknown[];
        if (!arr || arr.length === 0) {
          errors.push(`${field.label}: At least one entry is required.`);
        }
      } else if (field.type === "email") {
        if (
          !val ||
          (typeof val === "string" &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val))
        ) {
          errors.push(`${field.label}: A valid email is required.`);
        }
      } else if (field.type === "number" || field.type === "currency") {
        const num = Number(val);
        if (val === "" || val === undefined || val === null || isNaN(num)) {
          errors.push(`${field.label}: A numeric value is required.`);
        } else if (field.min !== undefined && num < field.min) {
          errors.push(
            `${field.label}: Must be at least ${field.min}.`
          );
        }
      } else {
        if (!val || (typeof val === "string" && !val.trim())) {
          errors.push(`${field.label}: This field is required.`);
        }
      }
    }
  }

  return errors;
}
