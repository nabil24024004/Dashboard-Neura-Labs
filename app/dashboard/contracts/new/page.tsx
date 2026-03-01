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
            className="text-muted-foreground hover:text-foreground h-8"
          >
            <ArrowLeft className="h-4 w-4 mr-1" /> Contracts
          </Button>
        </Link>
        <div className="h-4 w-px bg-accent" />
        <h1 className="text-lg font-semibold text-foreground">
          New Agreement
        </h1>
      </div>

      <ContractWizard />
    </div>
  );
}
