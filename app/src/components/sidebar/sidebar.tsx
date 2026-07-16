'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, X } from 'lucide-react';
import { AdminLogo } from '../common/AdminLogo';
import { useVendorLocale } from '../../contexts/vendor-locale.context';
import { useVendorPortalBranding } from '../../hooks/use-vendor-portal-branding';

// ---------- Context ----------

interface SidebarContextType {
  isCollapsed: boolean;
  toggleCollapsed: () => void;
  isMobile: boolean;
  isMobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) throw new Error('useSidebar must be used within a Sidebar');
  return context;
};

const MOBILE_BREAKPOINT = 1024;

// ---------- Sidebar ----------

interface SidebarProps {
  children: React.ReactNode;
}

export function Sidebar({ children }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

    const syncViewport = () => {
      const mobile = mediaQuery.matches;
      setIsMobile(mobile);
      if (!mobile) {
        setMobileOpen(false);
      }
    };

    syncViewport();
    mediaQuery.addEventListener('change', syncViewport);
    return () => mediaQuery.removeEventListener('change', syncViewport);
  }, []);

  useEffect(() => {
    if (!isMobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileOpen]);

  return (
    <SidebarContext.Provider
      value={{
        isCollapsed,
        toggleCollapsed: () => setIsCollapsed((v) => !v),
        isMobile,
        isMobileOpen,
        setMobileOpen,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

interface SidebarPanelProps {
  children: React.ReactNode;
}

export function SidebarPanel({ children }: SidebarPanelProps) {
  const { isCollapsed, isMobile, isMobileOpen, setMobileOpen } = useSidebar();
  const { isRtl, isVendorPortal, copy } = useVendorLocale();
  const {
    displayName: siteName,
    logo: siteLogo,
    isBrandingPending,
  } = useVendorPortalBranding();
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setPortalTarget(document.body);
  }, []);

  useEffect(() => {
    if (!isMobileOpen || !isMobile) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isMobile, isMobileOpen, setMobileOpen]);

  // Identical admin sidebar chrome for vendor and platform admin.
  if (!isMobile) {
    return (
      <aside
        className={`
          relative z-20 flex h-full shrink-0 flex-col bg-white shadow-s1
          transition-[width] duration-300 ease-in-out
          ${isCollapsed ? 'w-18' : 'w-70'}
        `}
      >
        {children}
      </aside>
    );
  }

  if (!portalTarget) {
    return null;
  }

  // Same admin drawer. Vendor AR opens from the right; EN/admin from the left.
  const openFromRight = isRtl;
  const closedTransform = openFromRight ? 'translate-x-full' : '-translate-x-full';

  return createPortal(
    <div aria-hidden={!isMobileOpen}>
      <button
        type="button"
        aria-label="Close navigation menu"
        tabIndex={isMobileOpen ? 0 : -1}
        className={`
          fixed inset-0 z-[60] bg-black/45 backdrop-blur-[1px]
          transition-opacity duration-300
          ${isMobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}
        `}
        onClick={() => setMobileOpen(false)}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        dir={isRtl ? 'rtl' : 'ltr'}
        className={`
          fixed inset-y-0 z-[70] flex w-[min(20rem,88vw)] flex-col
          bg-white shadow-2xl
          transition-transform duration-300 ease-out
          pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]
          ${openFromRight ? 'right-0' : 'left-0'}
          ${isMobileOpen ? 'translate-x-0' : closedTransform}
        `}
      >
        <div className="flex items-center justify-between gap-3 border-b border-b1 px-4 py-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="shrink-0 [&>div]:h-11 [&>div]:w-11 [&_img]:h-11 [&_img]:w-11">
              <AdminLogo
                src={siteLogo}
                pending={isBrandingPending}
                alt={siteName}
              />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-gray-900 sm:text-base">
                {siteName || 'OrdonSooq'}
              </p>
              <p className="truncate text-xs text-gray-500">
                {isVendorPortal ? copy.vendorPortal : 'Admin Dashboard'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation menu"
            className="inline-flex h-13 w-13 min-w-13 shrink-0 items-center justify-center rounded-r1 text-primary transition-colors hover:bg-primary/10"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </aside>
    </div>,
    portalTarget,
  );
}

// ---------- Header ----------

interface SidebarHeaderProps {
  logo?: React.ReactNode;
  children: React.ReactNode;
}

export function SidebarHeader({ logo, children }: SidebarHeaderProps) {
  const { isCollapsed, toggleCollapsed, isMobile } = useSidebar();

  return (
    <div
      className={`
        border-b border-b1 flex items-center min-h-[4.5rem] py-3
        transition-all duration-300 ease-in-out
        ${isCollapsed && !isMobile ? 'justify-center px-2' : 'justify-between px-4'}
      `}
    >
      <div
        className={`
          flex min-w-0 items-center transition-all duration-300 ease-in-out
          ${isCollapsed && !isMobile ? 'justify-center' : 'flex-1 gap-3 pe-6'}
        `}
      >
        {logo ? (
          <div
            className={`
              shrink-0 transition-all duration-300 ease-in-out
              ${isCollapsed && !isMobile
                ? 'h-10 w-10 [&_img]:h-10 [&_img]:w-10 [&>div]:h-10 [&>div]:w-10'
                : 'h-11 w-11 [&_img]:h-11 [&_img]:w-11 [&>div]:h-11 [&>div]:w-11'}
            `}
          >
            {logo}
          </div>
        ) : null}

        <div
          className={`
            min-w-0 overflow-hidden transition-all duration-300 ease-in-out
            ${isCollapsed && !isMobile ? 'max-w-0 opacity-0' : 'flex-1 opacity-100'}
          `}
        >
          {children}
        </div>
      </div>

      {!isMobile && (
        <button
          onClick={toggleCollapsed}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="
            absolute -end-3.5 top-13 -translate-y-1/2 z-20
            flex items-center justify-center
            w-7 h-7 rounded-full shrink-0
            bg-white text-primary
            shadow-[0_2px_8px_rgba(0,0,0,0.14),0_0_0_1px_rgba(0,0,0,0.06)]
            hover:shadow-[0_4px_12px_rgba(0,0,0,0.18),0_0_0_1px_rgba(0,0,0,0.08)]
            hover:scale-110
            transition-all duration-200 ease-out
            focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40
          "
        >
          <ChevronLeft
            size={15}
            strokeWidth={2.5}
            className={`
              transition-transform duration-300 ease-in-out rtl:-scale-x-100
              ${isCollapsed ? 'rotate-180' : 'rotate-0'}
            `}
          />
        </button>
      )}
    </div>
  );
}

// ---------- Content ----------

interface SidebarContentProps {
  children: React.ReactNode;
}

export function SidebarContent({ children }: SidebarContentProps) {
  return (
    <nav className="flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-2 py-3 sm:py-4 [&::-webkit-scrollbar]:w-0 [scrollbar-width:none]">
      {children}
    </nav>
  );
}

// ---------- Footer ----------

interface SidebarFooterProps {
  children: React.ReactNode;
}

export function SidebarFooter({ children }: SidebarFooterProps) {
  return (
    <div className="shrink-0 border-t border-b1 bg-white p-3 sm:p-4">
      {children}
    </div>
  );
}

// ---------- Group ----------

interface SidebarGroupProps {
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  icon?: React.ReactNode;
}

export function SidebarGroup({
  label,
  children,
  defaultOpen = true,
  icon,
}: SidebarGroupProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const { isCollapsed, isMobile } = useSidebar();
  const showCollapsed = isCollapsed && !isMobile;

  return (
    <div className="mb-4">
      <div
        className={`
          grid transition-all duration-300 ease-in-out
          ${showCollapsed ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100'}
        `}
      >
        <div className="overflow-hidden">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="
              w-full flex items-center justify-between px-3 py-2 mb-1
              text-sm font-semibold
              transition-all duration-300 group
            "
          >
            <div className="flex items-center gap-2">
              {icon && (
                <span className="w-5 h-5 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                  {icon}
                </span>
              )}
              <span className="uppercase tracking-wide">{label}</span>
            </div>
            <svg
              className={`h-4 w-4 shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      <div
        className={`
          grid transition-all duration-300 ease-in-out
          ${showCollapsed || isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}
        `}
      >
        <div className="overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}

// ---------- Link ----------

interface SidebarLinkProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  badge?: string | number;
  exact?: boolean;
  onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
}

export function SidebarLink({
  href,
  icon,
  label,
  badge,
  exact = false,
  onClick,
}: SidebarLinkProps) {
  const pathname = usePathname();
  const { isRtl } = useVendorLocale();
  const { isCollapsed, isMobile, setMobileOpen } = useSidebar();
  const showCollapsed = isCollapsed && !isMobile;
  const isActive = exact
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);

  const linkRef = useRef<HTMLAnchorElement>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const handleMouseEnter = () => {
    if (!showCollapsed || !linkRef.current) return;
    const rect = linkRef.current.getBoundingClientRect();
    // Vendor AR places the sidebar on the right — tooltip opens toward content.
    setTooltipPos({
      x: isRtl ? rect.left - 10 : rect.right + 10,
      y: rect.top + rect.height / 2,
    });
  };

  const handleMouseLeave = () => setTooltipPos(null);

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (isMobile) {
      setMobileOpen(false);
    }
    onClick?.(event);
  };

  return (
    <>
      <Link
        ref={linkRef}
        href={href}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`
          group relative mb-1 flex items-center
          transition-all duration-300 ease-in-out
          ${showCollapsed
            ? 'justify-center gap-0 px-2 py-1.5'
            : `gap-3 rounded-r1 px-3 py-3 sm:py-2.5 ${isActive ? 'bg-primary text-white shadow-s2' : 'active:bg-primary/15 hover:bg-primary/10'}`
          }
        `}
      >
        <span
          className={`
            flex items-center justify-center shrink-0
            transition-all duration-300 ease-in-out
            ${showCollapsed
              ? `w-10 h-10 rounded-xl ${
                  isActive
                    ? 'bg-primary text-white shadow-s2 scale-105'
                    : 'bg-gray-100 text-gray-500 group-hover:bg-primary/15 group-hover:text-primary group-hover:scale-[1.08] group-hover:shadow-sm'
                }`
              : `w-5 h-5 group-hover:scale-110 ${isActive ? 'text-white' : ''}`
            }
          `}
        >
          {icon}
        </span>

        <span
          className={`
            font-medium text-sm whitespace-nowrap overflow-hidden
            transition-all duration-300 ease-in-out
            ${showCollapsed ? 'max-w-0 opacity-0' : 'max-w-50 flex-1 opacity-100'}
            ${isActive ? 'text-white' : ''}
          `}
        >
          {label}
        </span>

        {badge !== undefined && (
          <span
            className={`
              text-xs font-semibold rounded-full overflow-hidden whitespace-nowrap flex items-center justify-center
              transition-all duration-300 ease-in-out
              ${showCollapsed ? 'max-w-0 opacity-0 px-0 py-0' : 'max-w-12.5 px-2 py-0.5 opacity-100'}
              ${isActive ? 'bg-white text-primary' : 'bg-primary text-white'}
            `}
          >
            {badge}
          </span>
        )}
      </Link>

      {showCollapsed && tooltipPos &&
        createPortal(
          <div
            role="tooltip"
            style={{
              top: tooltipPos.y,
              left: tooltipPos.x,
              transform: isRtl
                ? 'translate(-100%, -50%)'
                : 'translateY(-50%)',
            }}
            className="
              fixed z-9999 pointer-events-none
              flex items-center
              animate-in fade-in duration-150
            "
          >
            <span className="
              whitespace-nowrap px-3 py-1.5
              bg-gray-800 text-white text-xs font-medium
              rounded-lg shadow-xl
            ">
              {label}
              {badge !== undefined && (
                <span className="ms-2 px-1.5 py-0.5 bg-primary rounded-full text-white text-[10px] font-semibold">
                  {badge}
                </span>
              )}
            </span>
          </div>,
          document.body
        )
      }
    </>
  );
}

// ---------- Divider ----------

interface SidebarDividerProps {
  className?: string;
}

export function SidebarDivider({ className = '' }: SidebarDividerProps) {
  return <div className={`my-4 border-t border-b1 ${className}`} />;
}

// ---------- Link skeleton (loading placeholder) ----------

export function SidebarLinkSkeleton() {
  const { isCollapsed, isMobile } = useSidebar();
  const showCollapsed = isCollapsed && !isMobile;

  return (
    <div
      className={`
        mb-1 flex items-center animate-pulse
        ${showCollapsed ? 'justify-center px-2 py-1.5' : 'gap-3 px-3 py-2.5'}
      `}
      aria-hidden="true"
    >
      <div
        className={`
          shrink-0 rounded-xl bg-gray-200
          ${showCollapsed ? 'h-10 w-10' : 'h-5 w-5 rounded-full'}
        `}
      />
      {!showCollapsed && (
        <div className="h-4 max-w-28 flex-1 rounded bg-gray-200" />
      )}
    </div>
  );
}
