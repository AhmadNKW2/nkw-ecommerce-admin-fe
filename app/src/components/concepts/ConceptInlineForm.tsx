"use client";

import { useEffect, useState } from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { TermsPillInput } from "./TermsPillInput";
import type { TermGroupItem } from "../../services/terms/types/term.types";

export type ConceptFormPayload = {
  concept_key: string;
  concept_label_en?: string;
  concept_label_ar?: string;
  terms_en: string[];
  terms_ar: string[];
};

interface ConceptInlineFormProps {
  mode: "create" | "edit";
  concept?: TermGroupItem | null;
  onSubmit: (payload: ConceptFormPayload) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export const ConceptInlineForm: React.FC<ConceptInlineFormProps> = ({
  mode,
  concept,
  onSubmit,
  onCancel,
  isSubmitting = false,
}) => {
  const [conceptKey, setConceptKey] = useState("");
  const [labelEn, setLabelEn] = useState("");
  const [labelAr, setLabelAr] = useState("");
  const [termsEn, setTermsEn] = useState<string[]>([]);
  const [termsAr, setTermsAr] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setConceptKey(concept?.concept_key ?? "");
    setLabelEn(concept?.concept_label_en ?? "");
    setLabelAr(concept?.concept_label_ar ?? "");
    setTermsEn(concept?.terms_en ?? []);
    setTermsAr(concept?.terms_ar ?? []);
    setError(null);
  }, [concept]);

  const handleSubmit = async () => {
    const key = conceptKey.trim();
    if (!key) {
      setError("Concept key is required.");
      return;
    }

    setError(null);
    await onSubmit({
      concept_key: key,
      concept_label_en: labelEn.trim() || undefined,
      concept_label_ar: labelAr.trim() || undefined,
      terms_en: termsEn,
      terms_ar: termsAr,
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Input
          label="Concept key"
          value={conceptKey}
          onChange={(event) => setConceptKey(event.target.value)}
          placeholder="e.g. keyboard, ssd, laptop"
          disabled={isSubmitting}
        />
        <Input
          label="Label EN"
          value={labelEn}
          onChange={(event) => setLabelEn(event.target.value)}
          placeholder="English label"
          disabled={isSubmitting}
        />
        <Input
          label="Label AR"
          value={labelAr}
          onChange={(event) => setLabelAr(event.target.value)}
          placeholder="Arabic label"
          isRtl
          disabled={isSubmitting}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TermsPillInput
          label="Terms EN"
          value={termsEn}
          onChange={setTermsEn}
          disabled={isSubmitting}
          pillClassName="bg-primary/10 text-primary"
        />
        <TermsPillInput
          label="Terms AR"
          value={termsAr}
          onChange={setTermsAr}
          isRtl
          disabled={isSubmitting}
          pillClassName="bg-secondary/15 text-gray-800"
        />
      </div>

      {mode === "edit" && concept ? (
        <p className="text-xs text-gray-500">
          Reference products:{" "}
          {concept.reference_product_ids.length > 0
            ? concept.reference_product_ids.join(", ")
            : "-"}
        </p>
      ) : null}

      {error ? <p className="text-sm text-danger">{error}</p> : null}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting
            ? "Saving..."
            : mode === "edit"
              ? "Save Concept"
              : "Create Concept"}
        </Button>
      </div>
    </div>
  );
};
