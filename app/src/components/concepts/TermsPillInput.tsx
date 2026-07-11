"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Input } from "../ui/input";

interface TermsPillInputProps {
  label: string;
  value: string[];
  onChange: (terms: string[]) => void;
  placeholder?: string;
  isRtl?: boolean;
  pillClassName?: string;
  disabled?: boolean;
}

export const TermsPillInput: React.FC<TermsPillInputProps> = ({
  label,
  value,
  onChange,
  placeholder = "Type a term and press Enter",
  isRtl = false,
  pillClassName = "bg-primary/10 text-primary",
  disabled = false,
}) => {
  const [draft, setDraft] = useState("");

  const addTerm = (raw: string) => {
    const term = raw.trim();
    if (!term) {
      return;
    }

    const exists = value.some(
      (existing) => existing.toLowerCase() === term.toLowerCase(),
    );
    if (exists) {
      setDraft("");
      return;
    }

    onChange([...value, term]);
    setDraft("");
  };

  const removeTerm = (term: string) => {
    onChange(value.filter((item) => item !== term));
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addTerm(draft);
    }
  };

  return (
    <div className="w-full space-y-2" dir={isRtl ? "rtl" : "ltr"}>
      <Input
        label={label}
        value={draft}
        disabled={disabled}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        isRtl={isRtl}
        onClear={() => setDraft("")}
      />

      <div
        className={`min-h-12 rounded-r1 border border-b1 bg-gray-50 px-3 py-2 ${
          disabled ? "opacity-60" : ""
        }`}
      >
        {value.length === 0 ? (
          <p className="py-1 text-sm text-gray-400">
            Added terms will appear here as pills.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {value.map((term) => (
              <span
                key={term}
                className={`group relative inline-flex max-w-full items-center rounded-full px-2.5 py-1 text-xs ${pillClassName}`}
              >
                <span className="truncate pe-1">{term}</span>
                {!disabled ? (
                  <button
                    type="button"
                    onClick={() => removeTerm(term)}
                    className="absolute -inset-e-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-gray-800 text-white group-hover:inline-flex"
                    title={`Remove ${term}`}
                    aria-label={`Remove ${term}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                ) : null}
              </span>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500">{value.length} term(s)</p>
    </div>
  );
};
