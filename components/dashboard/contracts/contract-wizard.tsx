"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { pdf } from "@react-pdf/renderer";
import {
  type ContractType,
  CONTRACT_SCHEMAS,
  getDefaultValues,
  validateContractForm,
  generateContractTitle,
} from "@/lib/contracts/schemas";
import { ContractTypeSelector } from "./contract-type-selector";
import { ContractFormStep } from "./contract-form-step";
import { ContractReview } from "./contract-review";
import { ContractSuccess } from "./contract-success";
import { ContractPdfDocument } from "./contract-pdf-templates";

type WizardStep = "type" | "form" | "review" | "success";

interface GeneratedContract {
  title: string;
  contractType: string;
  pdfUrl: string | null;
  shareUrl: string | null;
  clientName: string;
  clientEmail: string | null;
}

export function ContractWizard() {
  const router = useRouter();

  const [step, setStep] = useState<WizardStep>("type");
  const [selectedType, setSelectedType] = useState<ContractType | null>(null);
  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [currentSection, setCurrentSection] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedContract, setGeneratedContract] =
    useState<GeneratedContract | null>(null);

  // ─── Step 1: Type Selection ─────────────────────────────────────
  const handleTypeSelect = useCallback((type: ContractType) => {
    setSelectedType(type);
    setFormValues(getDefaultValues(type));
    setCurrentSection(0);
    setError(null);
    setStep("form");
  }, []);

  // ─── Step 2: Form Navigation ───────────────────────────────────
  const handleFieldChange = useCallback((key: string, value: unknown) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleFormNext = useCallback(() => {
    if (!selectedType) return;
    const schema = CONTRACT_SCHEMAS[selectedType];
    if (currentSection < schema.sections.length - 1) {
      setCurrentSection((prev) => prev + 1);
    } else {
      // Last section → go to review
      setStep("review");
    }
  }, [selectedType, currentSection]);

  const handleFormBack = useCallback(() => {
    if (currentSection > 0) {
      setCurrentSection((prev) => prev - 1);
    }
  }, [currentSection]);

  const handleFormCancel = useCallback(() => {
    setStep("type");
    setSelectedType(null);
    setFormValues({});
    setCurrentSection(0);
    setError(null);
  }, []);

  // ─── Step 3: Review Actions ─────────────────────────────────────
  const handleEditSection = useCallback((sectionIdx: number) => {
    setCurrentSection(sectionIdx);
    setStep("form");
  }, []);

  const handleBackToLastSection = useCallback(() => {
    if (!selectedType) return;
    const schema = CONTRACT_SCHEMAS[selectedType];
    setCurrentSection(schema.sections.length - 1);
    setStep("form");
  }, [selectedType]);

  // Save as draft (no PDF generation)
  const handleSaveDraft = useCallback(async () => {
    if (!selectedType) return;
    setSavingDraft(true);
    setError(null);

    try {
      const clientName =
        String(formValues.client_name ?? formValues.client_company ?? "");
      const title = generateContractTitle(selectedType, clientName);

      const res = await fetch("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contract_type: selectedType,
          title,
          client_name: clientName,
          client_email: formValues.agency_email ?? null,
          field_values: formValues,
          status: "Draft",
        }),
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok) throw new Error(payload?.error ?? "Failed to save draft");

      setGeneratedContract({
        title,
        contractType: CONTRACT_SCHEMAS[selectedType].name,
        pdfUrl: null,
        shareUrl: null,
        clientName,
        clientEmail: String(formValues.agency_email ?? ""),
      });
      setStep("success");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setSavingDraft(false);
    }
  }, [selectedType, formValues]);

  // Generate PDF → upload → create contract record
  const handleGenerate = useCallback(async () => {
    if (!selectedType) return;

    // Validate
    const errors = validateContractForm(selectedType, formValues);
    if (errors.length > 0) {
      setError(errors.join("\n"));
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const clientName =
        String(formValues.client_name ?? formValues.client_company ?? "");
      const title = generateContractTitle(selectedType, clientName);

      // 1. Generate PDF blob client-side
      const blob = await pdf(
        <ContractPdfDocument type={selectedType} data={formValues} />
      ).toBlob();

      // 2. Upload to Supabase Storage via /api/upload
      const fd = new FormData();
      fd.append(
        "file",
        new File(
          [blob],
          `${selectedType}_${clientName.replace(/[^a-zA-Z0-9]/g, "_")}_${Date.now()}.pdf`,
          { type: "application/pdf" }
        )
      );
      fd.append("bucket", "contracts");

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: fd,
      });
      const uploadPayload = await uploadRes.json().catch(() => null);
      if (!uploadRes.ok)
        throw new Error(uploadPayload?.error ?? "Upload failed");

      const pdfUrl = uploadPayload.url;

      // 3. Create contract record
      const contractRes = await fetch("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contract_type: selectedType,
          title,
          client_name: clientName,
          client_email: formValues.agency_email ?? null,
          field_values: formValues,
          pdf_url: pdfUrl,
          status: "Draft",
        }),
      });

      const contractPayload = await contractRes.json().catch(() => null);
      if (!contractRes.ok)
        throw new Error(contractPayload?.error ?? "Failed to create contract");

      const shareToken = contractPayload.contract?.share_token;
      const shareUrl = shareToken
        ? `${window.location.origin}/agreements/view/${shareToken}`
        : null;

      // 4. Also store as a file record
      const fileRes = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          file_name: `${title}.pdf`,
          file_url: pdfUrl,
          file_type: "application/pdf",
          file_size: blob.size,
          client_name: clientName,
          description: `Generated contract: ${CONTRACT_SCHEMAS[selectedType].name}`,
        }),
      });

      if (!fileRes.ok) {
        const filePayload = await fileRes.json().catch(() => null);
        console.error(
          "Failed to add contract PDF to files list:",
          filePayload?.error ?? "Unknown error"
        );
      }

      setGeneratedContract({
        title,
        contractType: CONTRACT_SCHEMAS[selectedType].name,
        pdfUrl,
        shareUrl,
        clientName,
        clientEmail: String(formValues.agency_email ?? ""),
      });
      setStep("success");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred"
      );
    } finally {
      setGenerating(false);
    }
  }, [selectedType, formValues]);

  // ─── Step 4: Success Actions ────────────────────────────────────
  const handleNewContract = useCallback(() => {
    setStep("type");
    setSelectedType(null);
    setFormValues({});
    setCurrentSection(0);
    setError(null);
    setGeneratedContract(null);
  }, []);

  const handleBackToList = useCallback(() => {
    router.push("/dashboard/contracts");
  }, [router]);

  // ─── Render ─────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto">
      {/* Error display */}
      {error && (
        <div className="mb-4 p-3 rounded-lg border border-[#ef4444]/20 bg-[#ef4444]/5">
          <p className="text-sm text-[#ef4444] whitespace-pre-line">{error}</p>
          <button
            onClick={() => setError(null)}
            className="text-xs text-[#ef4444]/60 hover:text-[#ef4444] mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {step === "type" && (
        <ContractTypeSelector onSelect={handleTypeSelect} />
      )}

      {step === "form" && selectedType && (
        <ContractFormStep
          contractType={selectedType}
          currentSection={currentSection}
          values={formValues}
          onChange={handleFieldChange}
          onNext={handleFormNext}
          onBack={handleFormBack}
          onCancel={handleFormCancel}
        />
      )}

      {step === "review" && selectedType && (
        <ContractReview
          contractType={selectedType}
          values={formValues}
          onEditSection={handleEditSection}
          onBack={handleBackToLastSection}
          onGenerate={handleGenerate}
          onSaveDraft={handleSaveDraft}
          generating={generating}
          savingDraft={savingDraft}
        />
      )}

      {step === "success" && generatedContract && (
        <ContractSuccess
          title={generatedContract.title}
          contractType={generatedContract.contractType}
          pdfUrl={generatedContract.pdfUrl}
          shareUrl={generatedContract.shareUrl}
          clientName={generatedContract.clientName}
          clientEmail={generatedContract.clientEmail}
          onNewContract={handleNewContract}
          onBackToList={handleBackToList}
        />
      )}
    </div>
  );
}
