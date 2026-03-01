"use client";

import {
  type ContractType,
  CONTRACT_SCHEMAS,
} from "@/lib/contracts/schemas";
import { Button } from "@/components/ui/button";
import { Pencil, ChevronLeft, Loader2, FileText, Save } from "lucide-react";
import { format } from "date-fns";

function fmtDate(v: unknown): string {
  if (!v || typeof v !== "string") return "—";
  try {
    return format(new Date(v), "MMM d, yyyy");
  } catch {
    return String(v);
  }
}

function fmtCurrency(v: unknown): string {
  const n = Number(v);
  if (isNaN(n) || v === "" || v === undefined) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

function displayValue(
  type: string,
  value: unknown,
  suffix?: string
): string {
  if (value === undefined || value === null || value === "") return "—";

  switch (type) {
    case "date":
      return fmtDate(value);
    case "currency":
      return fmtCurrency(value);
    case "number":
      return suffix ? `${value} ${suffix}` : String(value);
    default:
      return String(value);
  }
}

interface ContractReviewProps {
  contractType: ContractType;
  values: Record<string, unknown>;
  onEditSection: (sectionIndex: number) => void;
  onBack: () => void;
  onGenerate: () => void;
  onSaveDraft: () => void;
  generating: boolean;
  savingDraft: boolean;
}

export function ContractReview({
  contractType,
  values,
  onEditSection,
  onBack,
  onGenerate,
  onSaveDraft,
  generating,
  savingDraft,
}: ContractReviewProps) {
  const schema = CONTRACT_SCHEMAS[contractType];
  const busy = generating || savingDraft;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">
          Review & Generate
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Review all the details below. Click &quot;Edit&quot; on any section to
          make changes.
        </p>
      </div>

      {/* Contract type badge */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Contract Type:</span>
        <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium border border-[#818cf8]/20">
          {schema.name}
        </span>
      </div>

      {/* Sections */}
      {schema.sections.map((section, sectionIdx) => (
        <div
          key={section.id}
          className="rounded-xl border border-border bg-card overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-3 bg-accent border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">
              {section.title}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEditSection(sectionIdx)}
              disabled={busy}
              className="text-primary hover:text-[#a5b4fc] hover:bg-primary/10 h-7 px-2"
            >
              <Pencil className="h-3 w-3 mr-1" /> Edit
            </Button>
          </div>
          <div className="p-5 space-y-3">
            {section.fields.map((field) => {
              const val = values[field.key];

              // Repeatable fields
              if (field.type === "repeatable") {
                const rows = (val as Record<string, unknown>[]) ?? [];
                if (rows.length === 0)
                  return (
                    <div key={field.key} className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">
                        {field.label}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        No entries added
                      </p>
                    </div>
                  );

                return (
                  <div key={field.key} className="space-y-2">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">
                      {field.label}
                    </p>
                    <div className="space-y-1.5">
                      {rows.map((row, i) => (
                        <div
                          key={i}
                          className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-foreground bg-background rounded-lg px-3 py-2 border border-border"
                        >
                          {field.repeatableFields?.map((sf) => (
                            <span key={sf.key}>
                              <span className="text-muted-foreground text-xs">
                                {sf.label}:{" "}
                              </span>
                              {displayValue(sf.type, row[sf.key], sf.suffix)}
                            </span>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }

              // Standard fields
              return (
                <div key={field.key} className="flex items-baseline gap-2">
                  <p className="text-xs text-muted-foreground min-w-[140px] shrink-0">
                    {field.label}
                  </p>
                  <p className="text-sm text-foreground">
                    {displayValue(field.type, val, field.suffix)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <Button
          variant="ghost"
          onClick={onBack}
          disabled={busy}
          className="text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={onSaveDraft}
            disabled={busy}
            className="bg-card border-border hover:bg-accent text-foreground"
          >
            {savingDraft ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            Save as Draft
          </Button>
          <Button
            onClick={onGenerate}
            disabled={busy}
            className="bg-[#6366f1] hover:bg-[#5558e6] text-white font-medium"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 mr-1" />
            )}
            Generate PDF
          </Button>
        </div>
      </div>
    </div>
  );
}
