'use client';

import type { ReactNode } from 'react';
import { useAuth } from '../../contexts/auth.context';
import type { SidebarRole } from './sidebar.config';
import { useResolvedFeatureToggles } from '../../hooks/use-resolved-feature-toggles';
import type { FeatureToggles } from '../../services/settings/types/settings.types';
import { AdminLogo } from '../common/AdminLogo';

import {
  Sidebar,
  SidebarHeader,
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
  >;
}

interface SidebarGroupItem {
  label: string;
  icon: ReactNode;
  defaultOpen?: boolean;
  links: SidebarLinkItem[];
}

interface AppSidebarProps {
  groups: SidebarGroupItem[];
  header?: {
    title: string;
    subtitle?: string;
    logo?: ReactNode;
  };
  footer?: {
    userName: string;
    userEmail: string;
    userAvatar?: string;
  };
}

function AppSidebarInner({ groups, header, footer }: AppSidebarProps) {
  const { logout, user } = useAuth();
  const { isCollapsed } = useSidebar();
  const userRole = user?.role;
  const {
    isVisibilityPending,
    isEnabled,
  } = useResolvedFeatureToggles();

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

  const isFeatureTogglePending = (link: SidebarLinkItem): boolean =>
    Boolean(link.featureToggle) &&
    isVisibilityPending &&
    passesRoleCheck(link);

  const canSeeLink = (link: SidebarLinkItem): boolean =>
    passesRoleCheck(link) && isFeatureToggleEnabled(link);

  const userDisplayName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ")
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
      {header && (
        <SidebarHeader logo={header.logo ?? <AdminLogo />}>
          <div className="min-w-0">
            <h1 className="text-base font-bold leading-tight">{header.title}</h1>
            {header.subtitle ? (
              <p className="text-xs leading-tight text-gray-500">{header.subtitle}</p>
            ) : null}
          </div>
        </SidebarHeader>
      )}

      <SidebarContent>
        {groups.map((group, groupIndex) => {
          const visibleLinks = group.links.filter(canSeeLink);
          const pendingLinks = group.links.filter(isFeatureTogglePending);

          if (visibleLinks.length === 0 && pendingLinks.length === 0) {
            return null;
          }

          const showDivider = groupIndex === groups.length - 2;

          return (
            <div key={`group-wrapper-${groupIndex}`}>
              <SidebarGroup
                label={group.label}
                icon={group.icon}
                defaultOpen={group.defaultOpen ?? true}
              >
                {visibleLinks.map((link, linkIndex) => (
                  <SidebarLink
                    key={`link-${groupIndex}-${linkIndex}`}
                    href={link.href}
                    icon={link.icon}
                    label={link.label}
                    badge={link.badge}
                    exact={link.exact}
                  />
                ))}
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
          <div className={`flex items-center gap-5 ${isCollapsed ? 'justify-center' : ''}`}>
            {footer.userAvatar ? (
              <img
                src={footer.userAvatar}
                alt={userDisplayName || footer.userName}
                className="w-10 h-10 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold shrink-0">
                {(userDisplayName || footer.userName).charAt(0).toUpperCase()}
              </div>
            )}
            {/* Name & email — hidden when collapsed */}
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">
                  {userDisplayName || footer.userName}
                </p>
                <p className="text-xs truncate">{user?.email || footer.userEmail}</p>
              </div>
            )}
            {/* Logout button — hidden when collapsed to save space */}
            {!isCollapsed && (
              <button
                onClick={handleLogout}
                className="p-2 hover: rounded-r1 transition-colors duration-300"
                title="Logout"
              >
                <svg
                  className="w-5 h-5"
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

export function AppSidebar({ groups, header, footer }: AppSidebarProps) {
  return (
    <Sidebar>
      <AppSidebarInner groups={groups} header={header} footer={footer} />
    </Sidebar>
  );
}
