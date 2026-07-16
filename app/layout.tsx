import type { Metadata } from "next";
import { Lato, Almarai } from "next/font/google";
import "./globals.css";
import "react-toastify/dist/ReactToastify.css";
import "nprogress/nprogress.css";
import { QueryProvider } from "./src/providers/query-provider";
import { LoadingProvider } from "./src/providers/loading-provider";
import { AuthProvider } from "./src/contexts/auth.context";
import { VendorLocaleProvider } from "./src/contexts/vendor-locale.context";
import { JobTrackerProvider } from "./src/providers/job-tracker-provider";
import { AppShell } from "./src/components/layout/AppShell";
import { FaviconManager } from "./src/components/layout/FaviconManager";
import { BrandThemeManager } from "./src/components/layout/BrandThemeManager";
import { DevSsrApiLogReset } from "./src/components/common/DevSsrApiLogReset";
import { ToastContainer, Slide } from "react-toastify";
import { getAdminDashboardTitle } from "./src/lib/site-branding";
import { fetchServerSeoSettings } from "./src/lib/seo-settings-server";

const lato = Lato({
  variable: '--font-lato',
  subsets: ['latin'],
  weight: ['100', '300', '400', '700', '900'],
  display: 'swap',
});

const almarai = Almarai({
  variable: '--font-almarai',
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '700', '800'],
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await fetchServerSeoSettings();
  const logo = settings?.site_logo?.trim();

  return {
    title: getAdminDashboardTitle(settings),
    description: "Admin dashboard for storefront management",
    ...(logo
      ? {
          icons: {
            icon: logo,
            shortcut: logo,
            apple: logo,
          },
        }
      : {}),
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${lato.variable} ${almarai.variable} antialiased`}
      >
        <QueryProvider>
          <BrandThemeManager />
          <FaviconManager />
          {process.env.NODE_ENV !== "production" ? <DevSsrApiLogReset /> : null}
          <LoadingProvider>
            <AuthProvider>
              <VendorLocaleProvider>
                <JobTrackerProvider>
                  <AppShell>{children}</AppShell>
                </JobTrackerProvider>
              </VendorLocaleProvider>
            </AuthProvider>
          </LoadingProvider>
          <ToastContainer
            position="bottom-right"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme="colored"
            transition={Slide}
          />
        </QueryProvider>
      </body>
    </html>
  );
}
