"use client";

import { useState } from "react";
import { Building2 } from "lucide-react";
import { useRouter } from "@/hooks/use-loading-router";
import { PageHeader } from "../../src/components/common/PageHeader";
import {
  PartnerForm,
  type PartnerFormErrors,
} from "../../src/components/partners/PartnerForm";
import { useCreatePartner } from "../../src/services/partners/hooks/use-partners";

export default function CreatePartnerPage() {
  const router = useRouter();
  const createPartner = useCreatePartner();

  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [errors, setErrors] = useState<PartnerFormErrors>({});

  const validate = () => {
    const nextErrors: PartnerFormErrors = {};

    if (!fullName.trim()) {
      nextErrors.full_name = "Full name is required";
    }

    if (!companyName.trim()) {
      nextErrors.company_name = "Company name is required";
    }

    if (!phoneNumber.trim()) {
      nextErrors.phone_number = "Phone number is required";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) {
      return;
    }

    await createPartner.mutateAsync({
      full_name: fullName.trim(),
      company_name: companyName.trim(),
      phone_number: phoneNumber.trim(),
    });

    router.push("/partners");
  };

  return (
    <div className="admin-page">
      <PageHeader
        icon={<Building2 />}
        title="Create Partner"
        description="Add a new partner contact and company"
        action={{
          label: "Save",
          onClick: handleSubmit,
          disabled:
            createPartner.isPending ||
            !fullName.trim() ||
            !companyName.trim() ||
            !phoneNumber.trim(),
        }}
        cancelAction={{
          label: "Back",
          onClick: () => router.push("/partners"),
          disabled: createPartner.isPending,
        }}
      />

      <PartnerForm
        fullName={fullName}
        companyName={companyName}
        phoneNumber={phoneNumber}
        errors={errors}
        isLoading={createPartner.isPending}
        submitLabel="Create Partner"
        onFullNameChange={setFullName}
        onCompanyNameChange={setCompanyName}
        onPhoneNumberChange={setPhoneNumber}
        onSubmit={handleSubmit}
        onCancel={() => router.push("/partners")}
      />
    </div>
  );
}