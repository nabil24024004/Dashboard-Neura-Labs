"use client";

import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Download,
  Copy,
  ExternalLink,
  ArrowLeft,
  Mail,
} from "lucide-react";
import { useState } from "react";

interface ContractSuccessProps {
  title: string;
  contractType: string;
  pdfUrl: string | null;
  shareUrl: string | null;
  clientName: string;
  clientEmail: string | null;
  onNewContract: () => void;
  onBackToList: () => void;
}

export function ContractSuccess({
  title,
  contractType,
  pdfUrl,
  shareUrl,
  clientName,
  clientEmail,
  onNewContract,
  onBackToList,
}: ContractSuccessProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopyLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = shareUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleSendToClient() {
    if (!shareUrl) return;
    const subject = encodeURIComponent(title);
    const body = encodeURIComponent(
      `Hi ${clientName || "there"},\n\n` +
        `Please find the agreement "${title}" ready for your review.\n\n` +
        `You can view and download the document using the link below:\n` +
        `${shareUrl}\n\n` +
        `If you have any questions or require changes, feel free to reply to this email.\n\n` +
        `Best regards`
    );
    const to = clientEmail ? encodeURIComponent(clientEmail) : "";
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1${to ? `&to=${to}` : ""}&su=${subject}&body=${body}`;
    window.open(gmailUrl, "_blank");
  }

  return (
    <div className="flex flex-col items-center text-center space-y-6 py-8">
      {/* Success icon */}
      <div className="h-16 w-16 rounded-full bg-[#22c55e]/10 flex items-center justify-center">
        <CheckCircle2 className="h-8 w-8 text-[#22c55e]" />
      </div>

      <div>
        <h2 className="text-xl font-semibold text-[#F5F5F5]">
          Contract Generated Successfully
        </h2>
        <p className="text-sm text-[#737373] mt-1 max-w-md">
          Your {contractType} has been created and is ready for distribution.
        </p>
      </div>

      {/* Contract info card */}
      <div className="w-full max-w-md rounded-xl border border-[#262626] bg-[#111111] p-5 text-left space-y-3">
        <div>
          <p className="text-xs text-[#737373] uppercase tracking-wider">
            Document Title
          </p>
          <p className="text-sm text-[#F5F5F5] font-medium mt-0.5">
            {title}
          </p>
        </div>
        <div>
          <p className="text-xs text-[#737373] uppercase tracking-wider">
            Status
          </p>
          <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md bg-[#22c55e]/10 text-[#22c55e] text-xs font-medium border border-[#22c55e]/20">
            Draft
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap justify-center gap-3 w-full max-w-md">
        {pdfUrl && (
          <Button
            onClick={() => window.open(pdfUrl, "_blank")}
            className="bg-[#F5F5F5] hover:bg-[#E5E5E5] text-[#0A0A0A] font-medium flex-1 min-w-[140px]"
          >
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        )}

        {shareUrl && (
          <Button
            variant="outline"
            onClick={handleCopyLink}
            className="bg-[#111111] border-[#262626] hover:bg-[#171717] text-[#F5F5F5] flex-1 min-w-[140px]"
          >
            {copied ? (
              <CheckCircle2 className="h-4 w-4 mr-2 text-[#22c55e]" />
            ) : (
              <Copy className="h-4 w-4 mr-2" />
            )}
            {copied ? "Copied!" : "Copy Share Link"}
          </Button>
        )}

        {shareUrl && (
          <Button
            variant="outline"
            onClick={() => window.open(shareUrl, "_blank")}
            className="bg-[#111111] border-[#262626] hover:bg-[#171717] text-[#F5F5F5] flex-1 min-w-[140px]"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Preview Link
          </Button>
        )}
      </div>

      {/* Send to Client */}
      {shareUrl && (
        <div className="w-full max-w-md">
          <Button
            onClick={handleSendToClient}
            className="w-full bg-[#6366f1] hover:bg-[#5558e6] text-white font-medium"
          >
            <Mail className="h-4 w-4 mr-2" />
            Send to Client{clientEmail ? ` (${clientEmail})` : ""}
          </Button>
          <p className="text-xs text-[#737373] mt-1.5 text-center">
            Opens Gmail with a pre-filled email containing the share link
          </p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center gap-4 pt-4 border-t border-[#262626] w-full max-w-md">
        <Button
          variant="ghost"
          onClick={onBackToList}
          className="text-[#737373] hover:text-[#F5F5F5] flex-1"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Contracts
        </Button>
        <Button
          variant="ghost"
          onClick={onNewContract}
          className="text-[#818cf8] hover:text-[#a5b4fc] hover:bg-[#818cf8]/10 flex-1"
        >
          Create Another
        </Button>
      </div>
    </div>
  );
}
