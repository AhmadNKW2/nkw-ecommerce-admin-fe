"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Search } from "lucide-react";
import { PageHeader } from "../../src/components/common/PageHeader";
import { SettingsNav } from "../../src/components/settings/SettingsNav";
import { Card } from "../../src/components/ui/card";
import { Input } from "../../src/components/ui/input";
import { Textarea } from "../../src/components/ui/textarea";
import { Toggle } from "../../src/components/ui/toggle";
import { Button } from "../../src/components/ui/button";
import { ImageUpload, ImageUploadItem } from "../../src/components/ui/image-upload";
import {
  useSeoSettings,
  useUpdateSeoSettings,
} from "../../src/services/settings/hooks/use-settings";
import { UpdateSeoSettingsDto } from "../../src/services/settings/types/settings.types";
import { mediaService } from "../../src/services/media/api/media.service";

type FormState = {
  site_name_en: string;
  site_name_ar: string;
  site_logo: ImageUploadItem | null;
  default_meta_title_en: string;
  default_meta_title_ar: string;
  default_meta_description_en: string;
  default_meta_description_ar: string;
  default_og_image: string;
  twitter_handle: string;
  google_verification: string;
  robots_index: boolean;
  robots_follow: boolean;
  show_sale_pricing: boolean;
  free_delivery_enabled: boolean;
  free_delivery_amount: number;
  delivery_fee: number;
};

const emptyFormState: FormState = {
  site_name_en: "",
  site_name_ar: "",
  site_logo: null,
  default_meta_title_en: "",
  default_meta_title_ar: "",
  default_meta_description_en: "",
  default_meta_description_ar: "",
  default_og_image: "",
  twitter_handle: "",
  google_verification: "",
  robots_index: true,
  robots_follow: true,
  show_sale_pricing: true,
  free_delivery_enabled: true,
  free_delivery_amount: 50,
  delivery_fee: 2,
};

export default function SeoSettingsPage() {
  const router = useRouter();
  const { data, isLoading, isError, error, refetch } = useSeoSettings();
  const updateSeoSettings = useUpdateSeoSettings();
  const [formState, setFormState] = useState<FormState>(emptyFormState);

  useEffect(() => {
    if (!data) {
      return;
    }

    setFormState({
      site_name_en: data.site_name_en ?? "",
      site_name_ar: data.site_name_ar ?? "",
      site_logo: data.site_logo
        ? {
            id: "site-logo",
            preview: data.site_logo,
            type: "image",
            order: 0,
          }
        : null,
      default_meta_title_en: data.default_meta_title_en ?? "",
      default_meta_title_ar: data.default_meta_title_ar ?? "",
      default_meta_description_en: data.default_meta_description_en ?? "",
      default_meta_description_ar: data.default_meta_description_ar ?? "",
      default_og_image: data.default_og_image ?? "",
      twitter_handle: data.twitter_handle ?? "",
      google_verification: data.google_verification ?? "",
      robots_index: data.robots_index ?? true,
      robots_follow: data.robots_follow ?? true,
      show_sale_pricing: data.show_sale_pricing ?? true,
      free_delivery_enabled: data.free_delivery_enabled ?? true,
      free_delivery_amount: data.free_delivery_amount ?? 50,
      delivery_fee: data.delivery_fee ?? 2,
    });
  }, [data]);

  const setField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    let siteLogoUrl: string | null = null;

    if (formState.site_logo) {
      if (formState.site_logo.file) {
        const uploadResult = await mediaService.uploadMedia(formState.site_logo.file);
        siteLogoUrl = uploadResult.data.url;
      } else {
        siteLogoUrl = formState.site_logo.preview;
      }
    }

    const payload: UpdateSeoSettingsDto = {
      site_name_en: formState.site_name_en,
      site_name_ar: formState.site_name_ar,
      site_logo: siteLogoUrl,
      default_meta_title_en: formState.default_meta_title_en,
      default_meta_title_ar: formState.default_meta_title_ar,
      default_meta_description_en: formState.default_meta_description_en,
      default_meta_description_ar: formState.default_meta_description_ar,
      default_og_image: formState.default_og_image || null,
      twitter_handle: formState.twitter_handle || null,
      google_verification: formState.google_verification || null,
      robots_index: formState.robots_index,
      robots_follow: formState.robots_follow,
      show_sale_pricing: formState.show_sale_pricing,
      free_delivery_enabled: formState.free_delivery_enabled,
      free_delivery_amount: Number(formState.free_delivery_amount) || 0,
      delivery_fee: Number(formState.delivery_fee) || 0,
    };

    await updateSeoSettings.mutateAsync(payload);
    router.refresh();
  };

  if (isError) {
    return (
      <div className="admin-page">
        <PageHeader
          icon={<Search />}
          title="SEO Settings"
          description="Manage site-wide storefront metadata defaults."
        />
        <SettingsNav />
        <Card>
          <div className="p-12 text-center">
            <div className="flex justify-center">
              <div className="rounded-full bg-danger/10 p-3">
                <AlertCircle className="h-8 w-8 text-danger" />
              </div>
            </div>
            <h3 className="mt-4 text-xl font-bold">Error Loading SEO Settings</h3>
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

  return (
    <div className="admin-page">
      <PageHeader
        icon={<Search />}
        title="SEO Settings"
        description="Manage the site-wide metadata and storefront visibility defaults."
        action={{
          label: updateSeoSettings.isPending ? "Saving..." : "Save Settings",
          onClick: handleSave,
          disabled: isLoading || updateSeoSettings.isPending,
        }}
      />

      <SettingsNav />

      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Site Identity</h2>
            <p className="mt-1 text-sm text-gray-500">
              Manage the site name and logo used in the admin panel and across the
              storefront.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Input
            label="Site Name (English)"
            value={formState.site_name_en}
            onChange={(event) => setField("site_name_en", event.target.value)}
            maxLength={120}
            disabled={isLoading || updateSeoSettings.isPending}
          />
          <Input
            label="Site Name (Arabic)"
            value={formState.site_name_ar}
            onChange={(event) => setField("site_name_ar", event.target.value)}
            maxLength={120}
            isRtl
            disabled={isLoading || updateSeoSettings.isPending}
          />
          <div className="lg:col-span-2">
            <ImageUpload
              label="Site Logo"
              value={formState.site_logo ? [formState.site_logo] : []}
              onChange={(items) =>
                setField("site_logo", items.length > 0 ? items[0] : null)
              }
              isMulti={false}
              accept="image/*"
              placeholder="or drag and drop a logo here"
              previewSize="lg"
            />
            <p className="mt-2 text-sm text-gray-500">
              Uploaded to storage and saved in settings. The admin panel shows a
              placeholder until a logo is saved here.
            </p>
          </div>
          <Input
            label="Default Meta Title (English)"
            value={formState.default_meta_title_en}
            onChange={(event) => setField("default_meta_title_en", event.target.value)}
            maxLength={70}
            disabled={isLoading || updateSeoSettings.isPending}
          />
          <Input
            label="Default Meta Title (Arabic)"
            value={formState.default_meta_title_ar}
            onChange={(event) => setField("default_meta_title_ar", event.target.value)}
            maxLength={70}
            isRtl
            disabled={isLoading || updateSeoSettings.isPending}
          />
          <Textarea
            label="Default Meta Description (English)"
            value={formState.default_meta_description_en}
            onChange={(event) => setField("default_meta_description_en", event.target.value)}
            maxLength={160}
            rows={4}
            disabled={isLoading || updateSeoSettings.isPending}
          />
          <Textarea
            label="Default Meta Description (Arabic)"
            value={formState.default_meta_description_ar}
            onChange={(event) => setField("default_meta_description_ar", event.target.value)}
            maxLength={160}
            rows={4}
            isRtl
            disabled={isLoading || updateSeoSettings.isPending}
          />
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold">Search & Social</h2>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Input
            label="Default OG Image URL"
            value={formState.default_og_image}
            onChange={(event) => setField("default_og_image", event.target.value)}
            maxLength={2048}
            disabled={isLoading || updateSeoSettings.isPending}
          />
          <Input
            label="Twitter Handle"
            value={formState.twitter_handle}
            onChange={(event) => setField("twitter_handle", event.target.value)}
            maxLength={255}
            disabled={isLoading || updateSeoSettings.isPending}
          />
          <Input
            label="Google Verification"
            value={formState.google_verification}
            onChange={(event) => setField("google_verification", event.target.value)}
            maxLength={255}
            disabled={isLoading || updateSeoSettings.isPending}
          />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
            <div>
              <p className="font-medium">Allow Indexing</p>
              <p className="text-sm text-gray-500">Controls global `robots.index`.</p>
            </div>
            <Toggle
              checked={formState.robots_index}
              onChange={(value) => setField("robots_index", value)}
              disabled={isLoading || updateSeoSettings.isPending}
            />
          </div>

          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
            <div>
              <p className="font-medium">Allow Following Links</p>
              <p className="text-sm text-gray-500">Controls global `robots.follow`.</p>
            </div>
            <Toggle
              checked={formState.robots_follow}
              onChange={(value) => setField("robots_follow", value)}
              disabled={isLoading || updateSeoSettings.isPending}
            />
          </div>

          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
            <div>
              <p className="font-medium">Show Sale Pricing</p>
              <p className="text-sm text-gray-500">
                Controls storefront sale styling and compare-at presentation.
              </p>
            </div>
            <Toggle
              checked={formState.show_sale_pricing}
              onChange={(value) => setField("show_sale_pricing", value)}
              disabled={isLoading || updateSeoSettings.isPending}
            />
          </div>

        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold">Delivery Settings</h2>
        <p className="mt-1 text-sm text-gray-500">
          Control the standard delivery fee and free-delivery rules shown on the storefront.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="flex flex-col gap-2 rounded-lg bg-gray-50 p-4">
            <div>
              <p className="font-medium">Standard Delivery Fee (JOD)</p>
              <p className="text-sm text-gray-500">
                Applied to orders that do not qualify for free delivery.
              </p>
            </div>
            <div className="w-48">
              <Input
                type="number"
                min={0}
                step={0.01}
                value={formState.delivery_fee}
                onChange={(event) =>
                  setField(
                    "delivery_fee",
                    Number.isNaN(event.target.valueAsNumber)
                      ? 0
                      : event.target.valueAsNumber,
                  )
                }
                disabled={isLoading || updateSeoSettings.isPending}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2 rounded-lg bg-gray-50 p-4">
            <div>
              <p className="font-medium">Free Delivery Threshold (JOD)</p>
              <p className="text-sm text-gray-500">
                Minimum order amount required to unlock free delivery.
              </p>
            </div>
            <div className="w-48">
              <Input
                type="number"
                min={0}
                step={0.01}
                value={formState.free_delivery_amount}
                onChange={(event) =>
                  setField(
                    "free_delivery_amount",
                    Number.isNaN(event.target.valueAsNumber)
                      ? 0
                      : event.target.valueAsNumber,
                  )
                }
                disabled={
                  isLoading ||
                  updateSeoSettings.isPending ||
                  !formState.free_delivery_enabled
                }
              />
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
            <div>
              <p className="font-medium">Enable Free Delivery</p>
              <p className="text-sm text-gray-500">
                When enabled, orders above the threshold ship for free.
              </p>
            </div>
            <Toggle
              checked={formState.free_delivery_enabled}
              onChange={(value) => setField("free_delivery_enabled", value)}
              disabled={isLoading || updateSeoSettings.isPending}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
