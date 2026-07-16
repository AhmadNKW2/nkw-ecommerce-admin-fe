import React from 'react';
import type { AdminAccessKey } from '@/lib/admin-access';

// roles: undefined = everyone, ['admin'] = admin only, ['admin','catalog_manager'] = both
export type SidebarRole =
  | 'admin'
  | 'catalog_manager'
  | 'vendor_admin'
  | 'store_admin';

export type SidebarLinkAction = 'openPopup';

export type SidebarLinkConfig = {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
  exact?: boolean;
  roles?: SidebarRole[];
  featureToggle?: string;
  adminAccess?: AdminAccessKey;
  catalogManagerBypass?: boolean;
  sidebarAction?: SidebarLinkAction;
};

export const sidebarConfig = {
  header: {
    title: 'Admin Dashboard',
  },
  footer: {
    userName: 'Admin User',
    userEmail: 'admin@th30.com',
  },
  groups: [
    // {
    //   label: 'Main Menu',
    //   icon: (
    //     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    //       <path
    //         strokeLinecap="round"
    //         strokeLinejoin="round"
    //         strokeWidth={2}
    //         d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
    //       />
    //     </svg>
    //   ),
    //   defaultOpen: true,
    //   links: [
    //     {
    //       href: '/',
    //       label: 'Dashboard',
    //       icon: (
    //         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    //           <path
    //             strokeLinecap="round"
    //             strokeLinejoin="round"
    //             strokeWidth={2}
    //             d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
    //           />
    //         </svg>
    //       ),
    //     },
    //   ],
    // },

    {
      label: 'Analytics',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
      defaultOpen: true,
      links: [
        {
          href: '/analytics',
          label: 'Google Analytics',
          roles: ['admin'] as SidebarRole[],
          adminAccess: 'analytics',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"
              />
            </svg>
          ),
        },
      ],
    },

    {
      label: 'Products',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
      ),
      defaultOpen: true,
      links: [
        {
          href: '/products',
          label: 'Products',
          exact: true,
          roles: ['admin', 'catalog_manager', 'vendor_admin', 'store_admin'] as SidebarRole[],
          adminAccess: 'products',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"
              />
            </svg>
          ),
        },
        {
          href: '/product-submissions',
          label: 'AI Submissions',
          roles: ['admin', 'catalog_manager'] as SidebarRole[],
          adminAccess: 'products',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
            </svg>
          ),
        },
      ],
    },

    {
      label: 'Search',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z"
          />
        </svg>
      ),
      defaultOpen: true,
      links: [
        {
          href: '/concepts',
          label: 'Concepts',
          roles: ['admin', 'catalog_manager'] as SidebarRole[],
          adminAccess: 'concepts',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          ),
        },
      ],
    },

    {
      label: 'E-Commerce',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
          />
        </svg>
      ),
      defaultOpen: true,
      links: [
        {
          href: '/banners',
          label: 'Banners',
          roles: ['admin'] as SidebarRole[],
          adminAccess: 'banners',
          featureToggle: 'banners_enabled' as const,
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="7" width="18" height="10" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
              <path d="M3 7l9 5 9-5" stroke="currentColor" strokeWidth="2" fill="none" />
            </svg>
          ),
        },
        {
          href: '/settings/popup',
          label: 'Site Popup',
          roles: ['admin'] as SidebarRole[],
          adminAccess: 'settings',
          featureToggle: 'popup_enabled' as const,
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 5a2 2 0 012-2h12a2 2 0 012 2v10a2 2 0 01-2 2H8l-4 4V5z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 9h8M8 13h5"
              />
            </svg>
          ),
        },
        {
          href: '/attributes',
          label: 'Attributes',
          roles: ['admin', 'catalog_manager'] as SidebarRole[],
          adminAccess: 'attributes',
          featureToggle: 'attributes_enabled' as const,
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
          ),
        },
        {
          href: '/specifications',
          label: 'Specifications',
          roles: ['admin', 'catalog_manager'] as SidebarRole[],
          adminAccess: 'specifications',
          featureToggle: 'specifications_enabled' as const,
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"
              />
            </svg>
          ),
        },
        {
          href: '/categories',
          label: 'Categories',
          roles: ['admin', 'catalog_manager'] as SidebarRole[],
          adminAccess: 'categories',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
          ),
        },
        {
          href: '/vendors',
          label: 'Vendors',
          roles: ['admin', 'catalog_manager'] as SidebarRole[],
          adminAccess: 'vendors',
          featureToggle: 'vendors_enabled' as const,
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          ),
        },
        {
          href: '/brands',
          label: 'Brands',
          roles: ['admin', 'catalog_manager'] as SidebarRole[],
          adminAccess: 'brands',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 5a4 4 0 11-8 0 4 4 0 018 0zM3 20a9 9 0 1118 0H3z"
              />
            </svg>
          ),
        },
        {
          href: '/customers',
          label: 'Customers',
          roles: ['admin'] as SidebarRole[],
          adminAccess: 'customers',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          ),
        },
        {
          href: '/partners',
          label: 'Partners',
          roles: ['admin'] as SidebarRole[],
          adminAccess: 'partners',
          featureToggle: 'partners_enabled' as const,
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 21h10M9 8h6M10 12h4M6 21V7a2 2 0 012-2h8a2 2 0 012 2v14M9 5V3h6v2"
              />
            </svg>
          ),
        },
        {
          href: '/notes',
          label: 'Notes',
          roles: ['admin'] as SidebarRole[],
          adminAccess: 'notes',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          ),
        },
        {
          href: '/admins',
          label: 'Admins',
          roles: ['admin'] as SidebarRole[],
          adminAccess: 'admins',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          ),
        },
        {
          href: '/orders',
          label: 'Orders',
          roles: ['admin'] as SidebarRole[],
          adminAccess: 'orders',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 17v-2a4 4 0 014-4h6m0 0l-3-3m3 3l-3 3M7 7h10M7 11h4M7 15h4M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z"
              />
            </svg>
          ),
        },
        {
          href: '/cashback-rules',
          label: 'Cashback Rules',
          roles: ['admin'] as SidebarRole[],
          adminAccess: 'cashback_rules',
          featureToggle: 'cashback_enabled' as const,
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 12H9m0 0l3-3m-3 3l3 3"
              />
            </svg>
          ),
        },
      ],
    },
    {
      label: 'Settings',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6V4m0 16v-2m8-6h-2M6 12H4m12.95 4.95-1.414-1.414M8.464 8.464 7.05 7.05m9.9 0-1.414 1.414M8.464 15.536 7.05 16.95M12 16a4 4 0 100-8 4 4 0 000 8z"
          />
        </svg>
      ),
      defaultOpen: false,
      links: [
        {
          href: '/settings/seo',
          label: 'SEO Settings',
          roles: ['admin'] as SidebarRole[],
          adminAccess: 'settings',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z"
              />
            </svg>
          ),
        },
        {
          href: '/settings/appearance',
          label: 'Appearance',
          roles: ['admin'] as SidebarRole[],
          adminAccess: 'settings',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
              />
            </svg>
          ),
        },
        {
          href: '/settings/features',
          label: 'Feature Settings',
          roles: ['admin'] as SidebarRole[],
          adminAccess: 'settings',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m0 10v-2m0 2a2 2 0 100-4m0 4a2 2 0 110-4M6 12H4m2 0h16"
              />
            </svg>
          ),
        },
        {
          href: '/settings/product-import',
          label: 'Product Import',
          roles: ['admin'] as SidebarRole[],
          adminAccess: 'settings',
          featureToggle: 'import_ai_products_enabled' as const,
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
          ),
        },
        {
          href: '/settings/inventory',
          label: 'Inventory Settings',
          roles: ['admin'] as SidebarRole[],
          adminAccess: 'settings',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          ),
        },
        {
          href: '/settings/shipping',
          label: 'Shipping Settings',
          roles: ['admin'] as SidebarRole[],
          adminAccess: 'settings',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10h2m8-1V6a1 1 0 011-1h2.5a1 1 0 01.8.4l3 4a1 1 0 01.2.6V16h-2"
              />
            </svg>
          ),
        },
        {
          href: '/settings/pricing',
          label: 'Pricing Rules',
          roles: ['admin'] as SidebarRole[],
          adminAccess: 'settings',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-10V6m0 12v-2m8-4a8 8 0 11-16 0 8 8 0 0116 0z"
              />
            </svg>
          ),
        },
        {
          href: '/settings/terms',
          label: 'Search Concepts',
          roles: ['admin', 'catalog_manager'] as SidebarRole[],
          adminAccess: 'settings',
          catalogManagerBypass: true,
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
              />
            </svg>
          ),
        },
        {
          href: '/settings/sidebar',
          label: 'Sidebar',
          roles: ['admin'] as SidebarRole[],
          adminAccess: 'settings',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          ),
        },
      ],
    },
    {
      label: 'Archived',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
          />
        </svg>
      ),
      defaultOpen: false,
      links: [
        {
          href: '/archived-categories',
          label: 'Archived Categories',
          roles: ['admin'] as SidebarRole[],
          adminAccess: 'archived',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
          ),
        },
        {
          href: '/archived-vendors',
          label: 'Archived Vendors',
          roles: ['admin'] as SidebarRole[],
          adminAccess: 'archived',
          featureToggle: 'vendors_enabled' as const,
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          ),
        },
        {
          href: '/archived-brands',
          label: 'Archived Brands',
          roles: ['admin'] as SidebarRole[],
          adminAccess: 'archived',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 11c1.657 0 3-1.567 3-3.5S13.657 4 12 4 9 5.567 9 7.5 10.343 11 12 11z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5.5 21a6.5 6.5 0 0113 0"
              />
            </svg>
          ),
        },
        {
          href: '/archived-products',
          label: 'Archived Products',
          roles: ['admin'] as SidebarRole[],
          adminAccess: 'archived',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          ),
        },
      ],
    },
  ],
};
