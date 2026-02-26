import { ContractWizard } from "@/components/dashboard/contracts/contract-wizard";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NewContractPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/contracts">
          <Button
            variant="ghost"
            size="sm"
            className="text-[#737373] hover:text-[#F5F5F5] h-8"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Contracts
          </Button>
        </Link>
        <div className="h-4 w-px bg-[#262626]" />
        <h1 className="text-lg font-semibold text-[#F5F5F5]">
          New Agreement
        </h1>
      </div>

      <ContractWizard />
    </div>
  );
}
