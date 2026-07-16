"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/contexts/auth.context";
import { isSimplifiedProductCreator } from "@/lib/simplified-product-creator";
import {
  VENDOR_PORTAL_COPY,
  type VendorPortalCopy,
  type VendorPortalLang,
} from "@/lib/vendor-portal-i18n";

const STORAGE_KEY = "vendor_portal_lang";

type VendorLocaleContextValue = {
  lang: VendorPortalLang;
  setLang: (lang: VendorPortalLang) => void;
  isRtl: boolean;
  copy: VendorPortalCopy;
  isVendorPortal: boolean;
};

const VendorLocaleContext = createContext<VendorLocaleContextValue | undefined>(
  undefined,
);

function readStoredLang(): VendorPortalLang {
  if (typeof window === "undefined") return "ar";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === "en" || stored === "ar" ? stored : "ar";
  } catch {
    return "ar";
  }
}

export function VendorLocaleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isVendorPortal = isSimplifiedProductCreator(user);
  const [lang, setLangState] = useState<VendorPortalLang>("ar");

  useEffect(() => {
    if (!isVendorPortal) return;
    setLangState(readStoredLang());
  }, [isVendorPortal]);

  const setLang = useCallback(
    (next: VendorPortalLang) => {
      setLangState(next);
      if (!isVendorPortal) return;
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // ignore storage failures
      }
    },
    [isVendorPortal],
  );

  // Arabic UI is RTL; English UI is LTR.
  const isRtl = isVendorPortal && lang === "ar";
  const copy = VENDOR_PORTAL_COPY[isVendorPortal ? lang : "en"];

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = isVendorPortal ? lang : "en";
    document.documentElement.dir = isRtl ? "rtl" : "ltr";
  }, [isRtl, isVendorPortal, lang]);

  const value = useMemo(
    () => ({
      lang: isVendorPortal ? lang : ("en" as VendorPortalLang),
      setLang,
      isRtl,
      copy,
      isVendorPortal,
    }),
    [copy, isRtl, isVendorPortal, lang, setLang],
  );

  return (
    <VendorLocaleContext.Provider value={value}>
      {children}
    </VendorLocaleContext.Provider>
  );
}

export function useVendorLocale() {
  const context = useContext(VendorLocaleContext);
  if (!context) {
    throw new Error("useVendorLocale must be used within VendorLocaleProvider");
  }
  return context;
}
