'use client';

import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { useAuth } from '../../contexts/auth.context';
import { useVendorLocale } from '../../contexts/vendor-locale.context';
import type { SidebarRole } from './sidebar.config';
import { sidebarConfig } from './sidebar.config';
import { useResolvedFeatureToggles } from '../../hooks/use-resolved-feature-toggles';
import type { FeatureToggles } from '../../services/settings/types/settings.types';
import { useAdminAccess } from '../../hooks/use-admin-access';
import type { AdminAccessKey } from '../../lib/admin-access';
import { passesAdminAccessCheck as checkAdminAccess } from '../../lib/admin-access-checks';
import { useSidebarCustomization } from '../../hooks/use-sidebar-customization';
import type { ResolvedSidebarGroup } from '../../hooks/use-sidebar-customization';
import { useAdminNotifications } from '../../hooks/use-admin-notifications';
import { VendorLocaleToggle } from '../vendor-portal/VendorLocaleToggle';

import {
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarLink,
  SidebarLinkSkeleton,
  SidebarDivider,
  useSidebar,
} from './sidebar';

interface SidebarLinkItem {
  href: string;
  label: string;
  icon: ReactNode;
  badge?: string | number;
  exact?: boolean;
  roles?: SidebarRole[];
  featureToggle?: keyof Pick<
    FeatureToggles,
    | 'vendors_enabled'
    | 'attributes_enabled'
    | 'specifications_enabled'
    | 'partners_enabled'
    | 'cashback_enabled'
    | 'banners_enabled'
    | 'import_ai_products_enabled'
    | 'popup_enabled'
  >;
  adminAccess?: AdminAccessKey;
  catalogManagerBypass?: boolean;
}

type SidebarGroupItem = ResolvedSidebarGroup;

interface AppSidebarProps {
  groups?: SidebarGroupItem[];
  footer?: {
    userName: string;
    userEmail: string;
    userAvatar?: string;
  };
}

function AppSidebarInner({ groups, footer }: AppSidebarProps) {
  const { logout, user } = useAuth();
  const { copy, isVendorPortal } = useVendorLocale();
  const { isCollapsed, isMobile } = useSidebar();
  const showCollapsed = isCollapsed && !isMobile;
  const userRole = user?.role;
  const { isVisibilityPending, isEnabled } = useResolvedFeatureToggles();
  const { canAccess } = useAdminAccess();
  const { applyLayoutToGroups, layoutVersion } = useSidebarCustomization();
  const { navBadges } = useAdminNotifications();

  const customizedGroups = useMemo(() => {
    const resolved = applyLayoutToGroups(
      (groups ?? sidebarConfig.groups) as Parameters<typeof applyLayoutToGroups>[0],
    );

    // Same admin sidebar structure; only translate visible product labels for vendor AR/EN.
    if (!isVendorPortal) return resolved;

    return resolved.map((group) => {
      const isProductsGroup =
        group.label.toLowerCase() === 'products' ||
        group.links.some((link) => link.href === '/products');

      return {
        ...group,
        label: isProductsGroup ? copy.productsGroup : group.label,
        links: group.links.map((link) =>
          link.href === '/products'
            ? { ...link, label: copy.products }
            : link,
        ),
      };
    });
  }, [
    applyLayoutToGroups,
    copy.products,
    copy.productsGroup,
    groups,
    isVendorPortal,
    layoutVersion,
  ]);

  const passesRoleCheck = (link: SidebarLinkItem): boolean => {
    if (!link.roles) return true;
    if (!userRole) return false;
    const effectiveRole =
      userRole === 'constant_token_admin' ? 'admin' : userRole;
    return link.roles.includes(effectiveRole as SidebarRole);
  };

  const isFeatureToggleEnabled = (link: SidebarLinkItem): boolean => {
    if (!link.featureToggle) return true;
    return isEnabled(link.featureToggle);
  };

  const passesAdminAccessCheck = (link: SidebarLinkItem): boolean =>
    checkAdminAccess(link.adminAccess, {
      role: userRole,
      canAccess,
      catalogManagerBypass: link.catalogManagerBypass,
    });

  const isFeatureTogglePending = (link: SidebarLinkItem): boolean =>
    Boolean(link.featureToggle) &&
    isVisibilityPending &&
    passesRoleCheck(link);

  const canSeeLink = (link: SidebarLinkItem): boolean =>
    passesRoleCheck(link) &&
    isFeatureToggleEnabled(link) &&
    passesAdminAccessCheck(link);

  const userDisplayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(' ')
    : undefined;

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <>
      <SidebarContent key={layoutVersion}>
        {customizedGroups.map((group, groupIndex) => {
          const groupLinks = group.links as SidebarLinkItem[];
          const visibleLinks = groupLinks.filter(canSeeLink);
          const pendingLinks = groupLinks.filter(isFeatureTogglePending);

          if (visibleLinks.length === 0 && pendingLinks.length === 0) {
            return null;
          }

          const showDivider = groupIndex === customizedGroups.length - 2;

          return (
            <div key={`group-wrapper-${groupIndex}`}>
              <SidebarGroup
                label={group.label}
                icon={group.icon}
                defaultOpen={group.defaultOpen ?? true}
              >
                {visibleLinks.map((link, linkIndex) => {
                  const liveBadge = navBadges[link.href];
                  return (
                    <SidebarLink
                      key={`link-${groupIndex}-${linkIndex}`}
                      href={link.href}
                      icon={link.icon}
                      label={link.label}
                      badge={liveBadge > 0 ? liveBadge : link.badge}
                      exact={link.exact}
                    />
                  );
                })}
                {pendingLinks.map((link) => (
                  <SidebarLinkSkeleton key={`pending-${link.href}`} />
                ))}
              </SidebarGroup>
              {showDivider && <SidebarDivider />}
            </div>
          );
        })}
      </SidebarContent>

      {footer && (
        <SidebarFooter>
          {isVendorPortal && !showCollapsed ? (
            <div className="mb-3">
              <VendorLocaleToggle className="w-full [&>button]:flex-1" />
            </div>
          ) : null}
          {isVendorPortal && showCollapsed ? (
            <div className="mb-3 flex justify-center">
              <VendorLocaleToggle compact />
            </div>
          ) : null}
          <div
            className={`flex items-center gap-3 sm:gap-5 ${showCollapsed ? 'justify-center' : ''}`}
          >
            {footer.userAvatar ? (
              <img
                src={footer.userAvatar}
                alt={userDisplayName || footer.userName}
                className="h-10 w-10 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary font-bold text-white">
                {(userDisplayName || footer.userName).charAt(0).toUpperCase()}
              </div>
            )}
            {!showCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {userDisplayName || footer.userName}
                </p>
                <p className="truncate text-xs text-gray-500">
                  {user?.email || footer.userEmail}
                </p>
              </div>
            )}
            {!showCollapsed && (
              <button
                onClick={handleLogout}
                className="inline-flex h-13 w-13 min-w-13 items-center justify-center rounded-r1 text-primary transition-colors hover:bg-primary/10 active:bg-primary/15"
                title={isVendorPortal ? copy.logout : 'Logout'}
                aria-label={isVendorPortal ? copy.logout : 'Logout'}
              >
                <svg
                  className="h-5 w-5 rtl:-scale-x-100"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </button>
            )}
          </div>
        </SidebarFooter>
      )}
    </>
  );
}

export function AppSidebar({ groups, footer }: AppSidebarProps) {
  return <AppSidebarInner groups={groups} footer={footer} />;
}
