"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Download, FileText, Loader2, AlertCircle } from "lucide-react";

interface SharedContract {
  id: string;
  contract_type: string;
  title: string;
  client_name: string;
  pdf_url: string | null;
  status: string;
  created_at: string;
  expires_at: string | null;
}

export default function SharedContractPage() {
  const params = useParams();
  const token = params.token as string;

  const [contract, setContract] = useState<SharedContract | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/contracts/share/${token}`);
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          setError(data?.error ?? "Contract not found");
          return;
        }
        setContract(data.contract);
      } catch {
        setError("Failed to load contract");
      } finally {
        setLoading(false);
      }
    }
    if (token) load();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[#737373]">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading document...</span>
        </div>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center space-y-4 max-w-sm">
          <div className="h-14 w-14 rounded-full bg-[#ef4444]/10 flex items-center justify-center mx-auto">
            <AlertCircle className="h-7 w-7 text-[#ef4444]" />
          </div>
          <h1 className="text-lg font-semibold text-[#F5F5F5]">
            Document Unavailable
          </h1>
          <p className="text-sm text-[#737373]">
            {error ||
              "This document could not be found. The link may have expired or been removed."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5]">
      {/* Top bar */}
      <div className="border-b border-[#262626] bg-[#111111]">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-[#818cf8]/10 flex items-center justify-center">
              <FileText className="h-4 w-4 text-[#818cf8]" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-[#F5F5F5]">
                {contract.title}
              </h1>
              <p className="text-xs text-[#737373]">
                Shared by Neura Labs
              </p>
            </div>
          </div>
          {contract.pdf_url && (
            <a
              href={contract.pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#F5F5F5] text-[#0A0A0A] text-sm font-medium hover:bg-[#E5E5E5] transition-colors"
            >
              <Download className="h-4 w-4" />
              Download PDF
            </a>
          )}
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {contract.pdf_url ? (
          <div className="rounded-xl border border-[#262626] bg-[#111111] overflow-hidden">
            <iframe
              src={contract.pdf_url}
              className="w-full h-[80vh]"
              title={contract.title}
            />
          </div>
        ) : (
          <div className="rounded-xl border border-[#262626] bg-[#111111] p-12 text-center">
            <FileText className="h-12 w-12 text-[#404040] mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-[#F5F5F5] mb-2">
              Document Preview Unavailable
            </h2>
            <p className="text-sm text-[#737373]">
              The PDF for this contract has not been generated yet. Please
              contact the sender for the document.
            </p>
          </div>
        )}

        {/* Footer info */}
        <div className="mt-6 text-center">
          <p className="text-xs text-[#404040]">
            This document was shared securely via Neura Labs Dashboard. Contact
            the sender if you have questions.
          </p>
        </div>
      </div>
    </div>
  );
}
