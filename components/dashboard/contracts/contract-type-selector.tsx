"use client";

import { CONTRACT_TYPES, type ContractType, type ContractTypeSchema } from "@/lib/contracts/schemas";
import { ShieldCheck, Handshake, ClipboardList, RefreshCcw } from "lucide-react";
import type { LucideIcon } from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  ShieldCheck,
  Handshake,
  ClipboardList,
  RefreshCcw,
};

interface ContractTypeSelectorProps {
  onSelect: (type: ContractType) => void;
}

export function ContractTypeSelector({ onSelect }: ContractTypeSelectorProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-[#F5F5F5]">
          Select Contract Type
        </h2>
        <p className="text-sm text-[#737373] mt-1">
          Choose the type of agreement you want to generate.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
        {CONTRACT_TYPES.map((schema: ContractTypeSchema) => {
          const Icon = ICON_MAP[schema.iconName] ?? ShieldCheck;
          return (
            <button
              key={schema.id}
              onClick={() => onSelect(schema.id)}
              className="group flex flex-col items-start gap-3 p-5 rounded-xl border border-[#262626] bg-[#111111] hover:border-[#818cf8]/50 hover:bg-[#818cf8]/5 transition-all text-left cursor-pointer"
            >
              <div className="h-10 w-10 rounded-lg bg-[#818cf8]/10 flex items-center justify-center group-hover:bg-[#818cf8]/20 transition-colors">
                <Icon className="h-5 w-5 text-[#818cf8]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#F5F5F5] group-hover:text-[#818cf8] transition-colors">
                  {schema.name}
                </h3>
                <p className="text-xs text-[#737373] mt-1 leading-relaxed">
                  {schema.description}
                </p>
              </div>
              <div className="text-[10px] text-[#404040] uppercase tracking-wider">
                {schema.sections.length} sections &bull;{" "}
                {schema.sections.reduce((acc, sec) => acc + sec.fields.length, 0)}{" "}
                fields
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
