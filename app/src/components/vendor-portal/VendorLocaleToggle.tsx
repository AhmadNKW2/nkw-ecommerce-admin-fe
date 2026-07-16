"use client";

import { useVendorLocale } from "@/contexts/vendor-locale.context";
import { cn } from "@/lib/utils";

type VendorLocaleToggleProps = {
  className?: string;
  /** Collapsed sidebar: show only the active language; click toggles. */
  compact?: boolean;
};

export function VendorLocaleToggle({
  className,
  compact = false,
}: VendorLocaleToggleProps) {
  const { lang, setLang, isVendorPortal } = useVendorLocale();

  if (!isVendorPortal) return null;

  if (compact) {
    const nextLang = lang === "ar" ? "en" : "ar";
    return (
      <button
        type="button"
        onClick={() => setLang(nextLang)}
        title={nextLang === "ar" ? "Switch to Arabic" : "Switch to English"}
        aria-label={
          nextLang === "ar" ? "Switch to Arabic" : "Switch to English"
        }
        className={cn(
          "inline-flex h-13 w-13 min-w-13 items-center justify-center rounded-r1 border border-primary2/40 bg-primary2 text-[16px] font-semibold text-white transition-colors hover:bg-primary2/90",
          className,
        )}
      >
        {lang === "ar" ? "AR" : "EN"}
      </button>
    );
  }

  return (
    <div
      dir="ltr"
      className={cn(
        "inline-flex h-13 shrink-0 items-stretch overflow-hidden rounded-r1 border border-primary2/40",
        className,
      )}
      role="group"
      aria-label="Language"
    >
      <button
        type="button"
        onClick={() => setLang("ar")}
        className={cn(
          "inline-flex h-13 min-w-13 items-center justify-center px-4 text-[16px] font-semibold transition-colors",
          lang === "ar"
            ? "bg-primary2 text-white"
            : "bg-white text-primary2 hover:bg-primary2/10",
        )}
      >
        AR
      </button>
      <button
        type="button"
        onClick={() => setLang("en")}
        className={cn(
          "inline-flex h-13 min-w-13 items-center justify-center border-s border-primary2/40 px-4 text-[16px] font-semibold transition-colors",
          lang === "en"
            ? "bg-primary2 text-white"
            : "bg-white text-primary2 hover:bg-primary2/10",
        )}
      >
        EN
      </button>
    </div>
  );
}
