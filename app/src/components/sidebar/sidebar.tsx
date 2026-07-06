'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';

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
  const [isMobile, setIsMobile] = useState(false);

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
  const { isCollapsed, isMobileOpen, setMobileOpen } = useSidebar();

  return (
    <>
      {isMobileOpen &&
        createPortal(
          <button
            type="button"
            aria-label="Close navigation menu"
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />,
          document.body,
        )}
      <aside
        className={`
          z-50 flex h-dvh w-70 flex-col bg-white shadow-s1
          transition-[width,transform] duration-300 ease-in-out
          fixed inset-y-0 left-0
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:relative lg:inset-auto lg:translate-x-0 lg:shrink-0
          ${isCollapsed ? 'lg:w-18' : 'lg:w-70'}
        `}
      >
        {children}
      </aside>
    </>
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
        border-b border-b1 flex items-center py-2
        transition-all duration-300 ease-in-out
        ${isCollapsed && !isMobile ? 'justify-center px-2' : 'justify-between px-4'}
      `}
    >
      <div
        className={`
          flex min-w-0 items-center transition-all duration-300 ease-in-out
          ${isCollapsed && !isMobile ? 'justify-center' : 'flex-1 gap-3 pr-6'}
        `}
      >
        {logo ? (
          <div
            className={`
              shrink-0 transition-all duration-300 ease-in-out
              ${isCollapsed && !isMobile ? 'h-10 w-10 [&_img]:h-10 [&_img]:w-10 [&>div]:h-10 [&>div]:w-10' : ''}
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
            absolute -right-3.5 top-13 -translate-y-1/2 z-20
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
              transition-transform duration-300 ease-in-out
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
    <nav className="flex-1 overflow-x-hidden overflow-y-auto py-4 px-2 [&::-webkit-scrollbar]:w-0 [scrollbar-width:none]">
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
    <div className="border-t border-b1 p-4">
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
              className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
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
    setTooltipPos({ x: rect.right + 10, y: rect.top + rect.height / 2 });
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
          group relative flex items-center mb-1
          transition-all duration-300 ease-in-out
          ${showCollapsed
            ? 'justify-center px-2 py-1.5 gap-0'
            : `px-3 py-2.5 gap-3 rounded-r1 ${isActive ? 'bg-primary text-white shadow-s2' : 'hover:bg-primary/10'}`
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
            style={{ top: tooltipPos.y, left: tooltipPos.x }}
            className="
              fixed z-9999 -translate-y-1/2 pointer-events-none
              flex items-center
              animate-in fade-in slide-in-from-left-2 duration-150
            "
          >
            <span className="
              w-0 h-0
              border-t-[5px] border-t-transparent
              border-b-[5px] border-b-transparent
              border-r-[6px] border-r-gray-800
            " />
            <span className="
              whitespace-nowrap px-3 py-1.5
              bg-gray-800 text-white text-xs font-medium
              rounded-lg shadow-xl
            ">
              {label}
              {badge !== undefined && (
                <span className="ml-2 px-1.5 py-0.5 bg-primary rounded-full text-white text-[10px] font-semibold">
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
