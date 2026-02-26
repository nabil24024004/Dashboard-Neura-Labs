"use client";

import { useState } from "react";
import {
  type ContractType,
  type ContractSection,
  type ContractField,
  CONTRACT_SCHEMAS,
} from "@/lib/contracts/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Plus, Trash2, Info } from "lucide-react";

// ──────────────────────────────────────────────────────────────────────
// Field Renderers
// ──────────────────────────────────────────────────────────────────────

function FieldLabel({ field }: { field: ContractField }) {
  return (
    <div className="flex items-center gap-1.5 mb-1">
      <label className="text-xs text-[#A3A3A3] font-medium">
        {field.label}
        {field.required && <span className="text-[#ef4444] ml-0.5">*</span>}
      </label>
      {field.suffix && (
        <span className="text-[10px] text-[#404040]">({field.suffix})</span>
      )}
      {field.tooltip && (
        <span className="group relative">
          <Info className="h-3 w-3 text-[#404040] cursor-help" />
          <span className="absolute left-0 bottom-full mb-1 hidden group-hover:block bg-[#1a1a1a] border border-[#262626] text-[#A3A3A3] text-[10px] p-2 rounded-md w-48 z-50 leading-relaxed">
            {field.tooltip}
          </span>
        </span>
      )}
    </div>
  );
}

function TextField({
  field,
  value,
  onChange,
}: {
  field: ContractField;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <FieldLabel field={field} />
      <Input
        type={field.type === "email" ? "email" : "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        className="bg-[#0A0A0A] border-[#262626] text-[#F5F5F5] placeholder:text-[#404040] h-9"
      />
    </div>
  );
}

function TextareaField({
  field,
  value,
  onChange,
}: {
  field: ContractField;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <FieldLabel field={field} />
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        rows={4}
        className="w-full rounded-md border border-[#262626] bg-[#0A0A0A] px-3 py-2 text-sm text-[#F5F5F5] placeholder:text-[#404040] outline-none resize-y min-h-[80px] focus:border-[#818cf8]/50 transition-colors"
      />
    </div>
  );
}

function NumberField({
  field,
  value,
  onChange,
}: {
  field: ContractField;
  value: string | number;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <FieldLabel field={field} />
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        min={field.min}
        step={field.type === "currency" ? "0.01" : "1"}
        className="bg-[#0A0A0A] border-[#262626] text-[#F5F5F5] placeholder:text-[#404040] h-9"
      />
    </div>
  );
}

function CurrencyField({
  field,
  value,
  onChange,
}: {
  field: ContractField;
  value: string | number;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <FieldLabel field={field} />
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#737373] text-sm">
          $
        </span>
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          step="0.01"
          min={0}
          className="bg-[#0A0A0A] border-[#262626] text-[#F5F5F5] placeholder:text-[#404040] h-9 pl-7"
        />
      </div>
    </div>
  );
}

function DateField({
  field,
  value,
  onChange,
}: {
  field: ContractField;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <FieldLabel field={field} />
      <Input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-[#0A0A0A] border-[#262626] text-[#F5F5F5] h-9 [color-scheme:dark]"
      />
    </div>
  );
}

function SelectField({
  field,
  value,
  onChange,
}: {
  field: ContractField;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <FieldLabel field={field} />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 rounded-md border border-[#262626] bg-[#0A0A0A] px-3 text-sm text-[#F5F5F5] outline-none focus:border-[#818cf8]/50 transition-colors"
      >
        <option value="">Select...</option>
        {field.options?.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

function RepeatableField({
  field,
  value,
  onChange,
}: {
  field: ContractField;
  value: Record<string, unknown>[];
  onChange: (v: Record<string, unknown>[]) => void;
}) {
  const subFields = field.repeatableFields ?? [];

  function addRow() {
    const emptyRow: Record<string, unknown> = {};
    for (const sf of subFields) {
      emptyRow[sf.key] = sf.defaultValue ?? "";
    }
    onChange([...value, emptyRow]);
  }

  function removeRow(idx: number) {
    onChange(value.filter((_, i) => i !== idx));
  }

  function updateRow(idx: number, key: string, val: unknown) {
    const updated = value.map((row, i) =>
      i === idx ? { ...row, [key]: val } : row
    );
    onChange(updated);
  }

  return (
    <div>
      <FieldLabel field={field} />
      <div className="space-y-3">
        {value.map((row, idx) => (
          <div
            key={idx}
            className="p-3 rounded-lg border border-[#262626] bg-[#0A0A0A]/50 space-y-2"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-[#404040] uppercase tracking-wider">
                Entry {idx + 1}
              </span>
              <button
                type="button"
                onClick={() => removeRow(idx)}
                className="text-[#ef4444] hover:text-[#ef4444]/80 transition-colors p-1"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {subFields.map((sf) => {
                const v = String(row[sf.key] ?? "");
                if (sf.type === "currency") {
                  return (
                    <CurrencyField
                      key={sf.key}
                      field={sf}
                      value={v}
                      onChange={(nv) => updateRow(idx, sf.key, nv)}
                    />
                  );
                }
                if (sf.type === "number") {
                  return (
                    <NumberField
                      key={sf.key}
                      field={sf}
                      value={v}
                      onChange={(nv) => updateRow(idx, sf.key, nv)}
                    />
                  );
                }
                if (sf.type === "date") {
                  return (
                    <DateField
                      key={sf.key}
                      field={sf}
                      value={v}
                      onChange={(nv) => updateRow(idx, sf.key, nv)}
                    />
                  );
                }
                return (
                  <TextField
                    key={sf.key}
                    field={sf}
                    value={v}
                    onChange={(nv) => updateRow(idx, sf.key, nv)}
                  />
                );
              })}
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={addRow}
          className="text-[#818cf8] hover:text-[#a5b4fc] hover:bg-[#818cf8]/10"
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Entry
        </Button>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Dynamic Field Renderer
// ──────────────────────────────────────────────────────────────────────
function DynamicField({
  field,
  value,
  onChange,
}: {
  field: ContractField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  switch (field.type) {
    case "textarea":
      return (
        <TextareaField
          field={field}
          value={String(value ?? "")}
          onChange={onChange}
        />
      );
    case "date":
      return (
        <DateField
          field={field}
          value={String(value ?? "")}
          onChange={onChange}
        />
      );
    case "number":
      return (
        <NumberField
          field={field}
          value={value as string | number}
          onChange={onChange}
        />
      );
    case "currency":
      return (
        <CurrencyField
          field={field}
          value={value as string | number}
          onChange={onChange}
        />
      );
    case "select":
      return (
        <SelectField
          field={field}
          value={String(value ?? "")}
          onChange={(v) => onChange(v)}
        />
      );
    case "repeatable":
      return (
        <RepeatableField
          field={field}
          value={(value as Record<string, unknown>[]) ?? []}
          onChange={onChange}
        />
      );
    case "email":
    case "text":
    default:
      return (
        <TextField
          field={field}
          value={String(value ?? "")}
          onChange={(v) => onChange(v)}
        />
      );
  }
}

// ──────────────────────────────────────────────────────────────────────
// Main Form Step Component
// ──────────────────────────────────────────────────────────────────────
interface ContractFormStepProps {
  contractType: ContractType;
  currentSection: number;
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  onNext: () => void;
  onBack: () => void;
  onCancel: () => void;
}

export function ContractFormStep({
  contractType,
  currentSection,
  values,
  onChange,
  onNext,
  onBack,
  onCancel,
}: ContractFormStepProps) {
  const schema = CONTRACT_SCHEMAS[contractType];
  const sections = schema.sections;
  const section = sections[currentSection];
  const isFirst = currentSection === 0;
  const isLast = currentSection === sections.length - 1;

  return (
    <div className="space-y-6">
      {/* Section progress */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {sections.map((sec, i) => (
            <div key={sec.id} className="flex items-center gap-2">
              <div
                className={`h-2 flex-1 rounded-full transition-colors min-w-[40px] ${
                  i < currentSection
                    ? "bg-[#818cf8]"
                    : i === currentSection
                    ? "bg-[#818cf8]/60"
                    : "bg-[#262626]"
                }`}
              />
            </div>
          ))}
        </div>
        <div>
          <p className="text-[10px] text-[#404040] uppercase tracking-wider">
            Section {currentSection + 1} of {sections.length}
          </p>
          <h3 className="text-lg font-semibold text-[#F5F5F5]">
            {section.title}
          </h3>
          {section.description && (
            <p className="text-sm text-[#737373]">{section.description}</p>
          )}
        </div>
      </div>

      {/* Fields */}
      <div className="space-y-4">
        {section.fields.map((field) => {
          // Repeatable fields take full width
          if (field.type === "repeatable") {
            return (
              <DynamicField
                key={field.key}
                field={field}
                value={values[field.key]}
                onChange={(v) => onChange(field.key, v)}
              />
            );
          }

          return (
            <DynamicField
              key={field.key}
              field={field}
              value={values[field.key]}
              onChange={(v) => onChange(field.key, v)}
            />
          );
        })}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-[#262626]">
        <div>
          {isFirst ? (
            <Button
              variant="ghost"
              onClick={onCancel}
              className="text-[#737373] hover:text-[#F5F5F5]"
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Back to Types
            </Button>
          ) : (
            <Button
              variant="ghost"
              onClick={onBack}
              className="text-[#737373] hover:text-[#F5F5F5]"
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
          )}
        </div>
        <Button
          onClick={onNext}
          className="bg-[#F5F5F5] hover:bg-[#E5E5E5] text-[#0A0A0A] font-medium"
        >
          {isLast ? "Review" : "Next"}
          {!isLast && <ChevronRight className="h-4 w-4 ml-1" />}
        </Button>
      </div>
    </div>
  );
}
