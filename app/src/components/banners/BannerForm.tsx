"use client";

/**
 * Banner Form Component
 * Reusable form for creating and editing banners
 */

import { useRouter } from "@/hooks/use-loading-router";
import { Card } from "../ui/card";
import { Toggle } from "../ui/toggle";
import { ImageUpload, ImageUploadItem } from "../ui/image-upload";
import { PageHeader } from "../common/PageHeader";
import { ImageIcon } from "lucide-react";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { RadioCard } from "../ui/radio-card";
import { BannerLanguage } from "../../types/banners/banner.types";
import { useEnterToSubmit } from "../../hooks/use-enter-to-submit";

export interface BannerFormProps {
    mode: "create" | "edit";
    image: ImageUploadItem | null;
    link?: string;
    visible: boolean;
    language: BannerLanguage;
    onImageChange: (value: ImageUploadItem | null) => void;
    onLinkChange: (value: string) => void;
    onVisibleChange: (value: boolean) => void;
    onLanguageChange: (value: BannerLanguage) => void;
    formErrors: {
        image?: string;
        language?: string;
        link?: string;
    };
    onSubmit: () => void;
    isSubmitting: boolean;
    submitButtonText: string;
}

export const BannerForm: React.FC<BannerFormProps> = ({
    mode,
    image,
    link,
    visible,
    language,
    onImageChange,
    onLinkChange,
    onVisibleChange,
    onLanguageChange,
    formErrors,
    onSubmit,
    isSubmitting,
    submitButtonText,
}) => {
    const router = useRouter();
    useEnterToSubmit(onSubmit, isSubmitting);

    return (
        <div className="admin-page">
            <PageHeader
                icon={<ImageIcon />}
                title={mode === "create" ? "Create Banner" : "Edit Banner"}
                description={mode === "create" ? "Add a new banner to your website" : "Update banner details"}
                cancelAction={{
                    label: "Cancel",
                    onClick: () => router.back(),
                    disabled: isSubmitting,
                }}
                action={{
                    label: isSubmitting ? "Saving..." : submitButtonText,
                    onClick: onSubmit,
                    disabled: isSubmitting,
                }}
            />


            <div className="grid grid-cols-1 gap-6">
                <div className="space-y-6">
                    {/* Image Upload */}
                    <Card className="p-6 space-y-4">
                        <h3 className="text-lg font-medium">Banner Details</h3>

                        <div className="space-y-2">
                            <div className="text-sm font-medium">Language</div>
                            <div className="flex gap-5">
                                <RadioCard
                                    name="banner-language"
                                    value="en"
                                    checked={language === "en"}
                                    onChange={() => onLanguageChange("en" as BannerLanguage)}
                                    label="English"
                                />
                                <RadioCard
                                    name="banner-language"
                                    value="ar"
                                    checked={language === "ar"}
                                    onChange={() => onLanguageChange("ar" as BannerLanguage)}
                                    label="Arabic"
                                />
                            </div>
                            {formErrors.language && (
                                <span className="text-xs text-danger mt-1 block">{formErrors.language}</span>
                            )}
                        </div>
                        
                        <Input
                            label="Link URL"
                            value={link}
                            onChange={(e) => onLinkChange(e.target.value)}
                            error={formErrors.link}
                        />

                        {/* Image Upload */}
                        <ImageUpload
                            label="Banner Image"
                            value={image ? [image] : []}
                            onChange={(items) => onImageChange(items.length > 0 ? items[0] : null)}
                            error={formErrors.image}
                            isMulti={false}
                            accept="image/*"
                            placeholder="or drag and drop an image here"
                            previewSize="lg"
                        />

                        {/* Visibility Status */}
                        <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                            <p className="font-medium">Visible</p>
                            <Toggle
                                checked={visible}
                                onChange={onVisibleChange}
                            />
                        </div>

                    </Card>
                </div>
            </div>
        </div>
    );
};
