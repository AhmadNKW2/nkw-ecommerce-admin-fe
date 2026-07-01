"use client";

import { useEffect, useState } from "react";
import { AlertCircle, ImageIcon } from "lucide-react";
import { PageHeader } from "../../src/components/common/PageHeader";
import { FeatureToggleGuard } from "../../src/components/settings/FeatureToggleGuard";
import { Card } from "../../src/components/ui/card";
import { Input } from "../../src/components/ui/input";
import { Button } from "../../src/components/ui/button";
import { ImageUpload, ImageUploadItem } from "../../src/components/ui/image-upload";
import {
  useSitePopupSettings,
  useUpdateSitePopupSettings,
} from "../../src/services/settings/hooks/use-settings";
import { useResolvedFeatureToggles } from "../../src/hooks/use-resolved-feature-toggles";
import { mediaService } from "../../src/services/media/api/media.service";
import type { UpdateSitePopupSettingsDto } from "../../src/services/settings/types/settings.types";

type FormState = {
  image: ImageUploadItem | null;
  link_url: string;
  dismiss_after_seconds: number;
};

const emptyFormState: FormState = {
  image: null,
  link_url: "",
  dismiss_after_seconds: 8,
};

export default function SitePopupSettingsPage() {
  return (
    <FeatureToggleGuard toggle="popup_enabled" redirectTo="/settings/features">
      <SitePopupSettingsPageContent />
    </FeatureToggleGuard>
  );
}

function SitePopupSettingsPageContent() {
  const { data, isLoading, isError, error, refetch } = useSitePopupSettings();
  const updateSitePopupSettings = useUpdateSitePopupSettings();
  const { isEnabled } = useResolvedFeatureToggles();
  const popupFeatureEnabled = isEnabled("popup_enabled");
  const [formState, setFormState] = useState<FormState>(emptyFormState);

  useEffect(() => {
    if (!data) {
      return;
    }

    setFormState({
      image: data.image_url
        ? {
            id: "site-popup-image",
            preview: data.image_url,
            type: "image",
            order: 0,
          }
        : null,
      link_url: data.link_url ?? "",
      dismiss_after_seconds: data.dismiss_after_seconds ?? 8,
    });
  }, [data]);

  const handleSave = async () => {
    let imageUrl: string | null = null;

    if (formState.image) {
      if (formState.image.file) {
        const uploadResult = await mediaService.uploadMedia(formState.image.file);
        imageUrl = uploadResult.data.url;
      } else {
        imageUrl = formState.image.preview;
      }
    }

    const payload: UpdateSitePopupSettingsDto = {
      enabled: popupFeatureEnabled,
      image_url: imageUrl,
      link_url: formState.link_url.trim() || null,
      dismiss_after_seconds: Number(formState.dismiss_after_seconds) || 0,
    };

    await updateSitePopupSettings.mutateAsync(payload);
  };

  if (isError) {
    return (
      <div className="flex flex-col justify-center items-center gap-5 p-5">
        <PageHeader
          icon={<ImageIcon />}
          title="Site Popup"
          description="Configure the storefront welcome popup shown once per session."
        />
        <Card>
          <div className="p-12 text-center">
            <div className="flex justify-center">
              <div className="rounded-full bg-danger/10 p-3">
                <AlertCircle className="h-8 w-8 text-danger" />
              </div>
            </div>
            <h3 className="mt-4 text-xl font-bold">Error Loading Popup Settings</h3>
            <p className="mt-2 max-w-md mx-auto">
              {error instanceof Error ? error.message : "An error occurred"}
            </p>
            <Button onClick={() => refetch()} className="mt-4">
              Try Again
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const saving = updateSitePopupSettings.isPending;

  return (
    <div className="flex flex-col justify-center items-center gap-5 p-5">
      <PageHeader
        icon={<ImageIcon />}
        title="Site Popup"
        description="Upload a popup image for the storefront. It appears once per browser session and can auto-dismiss after a set time."
        action={{
          label: saving ? "Saving..." : "Save Popup",
          onClick: handleSave,
          disabled: isLoading || saving,
        }}
      />

      <Card className="w-full max-w-3xl">
        <ImageUpload
          label="Popup image"
          value={formState.image ? [formState.image] : []}
          onChange={(items) =>
            setFormState((prev) => ({ ...prev, image: items[0] ?? null }))
          }
          isMulti={false}
          accept="image/*"
          placeholder="Upload popup image"
          previewSize="lg"
        />

        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
          <Input
            label="Optional link URL"
            value={formState.link_url}
            onChange={(event) =>
              setFormState((prev) => ({ ...prev, link_url: event.target.value }))
            }
            disabled={saving}
          />
          <Input
            label="Auto-dismiss after (seconds)"
            type="number"
            min={0}
            max={120}
            value={String(formState.dismiss_after_seconds)}
            onChange={(event) =>
              setFormState((prev) => ({
                ...prev,
                dismiss_after_seconds: Number(event.target.value) || 0,
              }))
            }
            disabled={saving}
          />
        </div>

        <p className="mt-4 text-sm text-gray-500">
          Set auto-dismiss to 0 to keep the popup open until the customer closes it manually.
        </p>
      </Card>
    </div>
  );
}
