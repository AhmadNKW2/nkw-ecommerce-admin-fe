"use client";

import { useEffect, useState } from "react";
import { ImageIcon, X } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { Button } from "@/components/ui/button";
import { ImageUpload, ImageUploadItem } from "@/components/ui/image-upload";
import {
  useSitePopupSettings,
  useUpdateSitePopupSettings,
} from "@/services/settings/hooks/use-settings";
import { mediaService } from "@/services/media/api/media.service";
import type { UpdateSitePopupSettingsDto } from "@/services/settings/types/settings.types";

type FormState = {
  enabled: boolean;
  image: ImageUploadItem | null;
  link_url: string;
  dismiss_after_seconds: number;
};

const emptyFormState: FormState = {
  enabled: false,
  image: null,
  link_url: "",
  dismiss_after_seconds: 8,
};

export function PopupEditorModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { data, isLoading, isError, refetch } = useSitePopupSettings();
  const updateSitePopupSettings = useUpdateSitePopupSettings();
  const [formState, setFormState] = useState<FormState>(emptyFormState);

  useEffect(() => {
    if (!data) {
      return;
    }

    setFormState({
      enabled: data.enabled ?? false,
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
      enabled: formState.enabled,
      image_url: imageUrl,
      link_url: formState.link_url.trim() || null,
      dismiss_after_seconds: Number(formState.dismiss_after_seconds) || 0,
    };

    await updateSitePopupSettings.mutateAsync(payload);
    onClose();
  };

  const saving = updateSitePopupSettings.isPending;

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="w-full max-w-2xl self-start">
      <div className="flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <ImageIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-slate-950">Site Popup</h2>
              <p className="text-xs text-slate-500">Quick-edit the storefront welcome popup.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isError ? (
          <Card className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
            <p className="text-sm font-medium text-rose-700">Failed to load popup settings.</p>
            <Button onClick={() => refetch()} className="mt-3" variant="outline">
              Try again
            </Button>
          </Card>
        ) : (
          <>
            <Card className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
                <div className="pr-4">
                  <p className="font-medium">Enable popup</p>
                  <p className="text-sm text-gray-500">
                    Show the popup once per browser session when an image is uploaded.
                  </p>
                </div>
                <Toggle
                  checked={formState.enabled}
                  onChange={(value) =>
                    setFormState((prev) => ({ ...prev, enabled: value }))
                  }
                  disabled={saving || isLoading}
                />
              </div>

              <div className="mt-5">
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
              </div>

              <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                <Input
                  label="Optional link URL"
                  value={formState.link_url}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, link_url: event.target.value }))
                  }
                  disabled={saving || isLoading}
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
                  disabled={saving || isLoading}
                />
              </div>

              <p className="mt-4 text-sm text-gray-500">
                Set auto-dismiss to 0 to keep the popup open until the customer closes it manually.
              </p>
            </Card>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                color="var(--color-primary2)"
                onClick={onClose}
                disabled={saving}
                className="rounded-full px-5"
              >
                Cancel
              </Button>
              <Button
                color="var(--color-primary2)"
                onClick={() => void handleSave()}
                disabled={saving || isLoading}
                className="rounded-full px-5"
              >
                {saving ? "Saving..." : "Save Popup"}
              </Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
