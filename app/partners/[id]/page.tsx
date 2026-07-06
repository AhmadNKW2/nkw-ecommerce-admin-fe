"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Building2 } from "lucide-react";
import { useRouter } from "@/hooks/use-loading-router";
import { useLoading } from "../../src/providers/loading-provider";
import {
  PartnerForm,
  type PartnerFormErrors,
} from "../../src/components/partners/PartnerForm";
import { PageHeader } from "../../src/components/common/PageHeader";
import { Card } from "../../src/components/ui/card";
import { Button } from "../../src/components/ui/button";
import { DeleteConfirmationModal } from "../../src/components/common/DeleteConfirmationModal";
import { EmptyState } from "../../src/components/common/EmptyState";
import {
  useDeletePartner,
  usePartner,
  useUpdatePartner,
} from "../../src/services/partners/hooks/use-partners";

export default function EditPartnerPage() {
  const { id } = useParams<{ id: string }>();
  const partnerId = Number(id);
  const router = useRouter();
  const { setShowOverlay } = useLoading();

  const { data: partner, isLoading, isError, error, refetch } = usePartner(partnerId, {
    enabled: Number.isFinite(partnerId),
  });
  const updatePartner = useUpdatePartner();
  const deletePartner = useDeletePartner();

  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [errors, setErrors] = useState<PartnerFormErrors>({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    setShowOverlay(isLoading);
  }, [isLoading, setShowOverlay]);

  useEffect(() => {
    if (!partner) {
      return;
    }

    setFullName(partner.full_name);
    setCompanyName(partner.company_name);
    setPhoneNumber(partner.phone_number);
  }, [partner]);

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

    await updatePartner.mutateAsync({
      id: partnerId,
      data: {
        full_name: fullName.trim(),
        company_name: companyName.trim(),
        phone_number: phoneNumber.trim(),
      },
    });

    router.push("/partners");
  };

  const handleDelete = async () => {
    await deletePartner.mutateAsync(partnerId);
    router.push("/partners");
  };

  if (isError) {
    return (
      <div className="admin-page">
        <PageHeader
          icon={<Building2 />}
          title="Edit Partner"
          description="Update partner details"
          cancelAction={{
            label: "Back",
            onClick: () => router.push("/partners"),
          }}
        />
        <Card>
          <EmptyState
            icon={<Building2 />}
            title="Partner not found"
            description={(error as any)?.message || "This partner does not exist."}
          />
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => router.push("/partners")}>Back to Partners</Button>
            <Button onClick={() => refetch()}>Retry</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <PageHeader
        icon={<Building2 />}
        title="Edit Partner"
        description={partner ? `Update partner #${partner.id}` : "Update partner details"}
        action={{
          label: "Save",
          onClick: handleSubmit,
          disabled:
            updatePartner.isPending ||
            !fullName.trim() ||
            !companyName.trim() ||
            !phoneNumber.trim(),
        }}
        cancelAction={{
          label: "Back",
          onClick: () => router.push("/partners"),
          disabled: updatePartner.isPending,
        }}
      />

      <PartnerForm
        fullName={fullName}
        companyName={companyName}
        phoneNumber={phoneNumber}
        errors={errors}
        isLoading={updatePartner.isPending}
        submitLabel="Save Changes"
        onFullNameChange={setFullName}
        onCompanyNameChange={setCompanyName}
        onPhoneNumberChange={setPhoneNumber}
        onSubmit={handleSubmit}
        onCancel={() => router.push("/partners")}
      />

      <Card className="max-w-2xl">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Delete Partner</h2>
            <p className="text-sm text-gray-500">
              Remove this partner record permanently from the admin panel.
            </p>
          </div>
          <Button variant="outline" onClick={() => setShowDeleteModal(true)}>
            Delete Partner
          </Button>
        </div>
      </Card>

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Delete Partner"
        message={`Are you sure you want to delete "${partner?.full_name || "this partner"}"?`}
        isLoading={deletePartner.isPending}
      />
    </div>
  );
}