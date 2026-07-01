import { sidebarConfig } from "@/components/sidebar/sidebar.config";
import { SETTINGS_LINK_DEFINITIONS } from "@/lib/settings-links";

export type SidebarLayoutGroup = {
  id: string;
  label: string;
  linkHrefs: string[];
};

export type SidebarLayout = {
  groups: SidebarLayoutGroup[];
};

export type SidebarLinkMeta = {
  href: string;
  label: string;
  defaultGroupId: string;
  featureToggle?: string;
};

export function slugifySidebarLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function buildLinkRegistry(): Map<string, SidebarLinkMeta> {
  const map = new Map<string, SidebarLinkMeta>();

  for (const group of sidebarConfig.groups) {
    const groupId = slugifySidebarLabel(group.label);
    for (const link of group.links) {
      const linkRecord = link as {
        href: string;
        label: string;
        featureToggle?: string;
      };
      map.set(linkRecord.href, {
        href: linkRecord.href,
        label: linkRecord.label,
        defaultGroupId: groupId,
        featureToggle: linkRecord.featureToggle,
      });
    }
  }

  return map;
}

export function getDefaultSidebarLayout(): SidebarLayout {
  return {
    groups: sidebarConfig.groups.map((group) => ({
      id: slugifySidebarLabel(group.label),
      label: group.label,
      linkHrefs: group.links.map((link) => link.href),
    })),
  };
}

export function normalizeSidebarLayout(
  layout: SidebarLayout,
  registry: Map<string, SidebarLinkMeta>,
): SidebarLayout {
  const usedHrefs = new Set<string>();
  const groups: SidebarLayoutGroup[] = layout.groups.map((group) => {
    const linkHrefs = group.linkHrefs.filter((href) => {
      if (!registry.has(href) || usedHrefs.has(href)) {
        return false;
      }
      usedHrefs.add(href);
      return true;
    });

    return {
      id: group.id || slugifySidebarLabel(group.label),
      label: group.label.trim() || "Untitled group",
      linkHrefs,
    };
  });

  const missingHrefs = [...registry.keys()].filter((href) => !usedHrefs.has(href));
  if (missingHrefs.length > 0) {
    const defaultLayout = getDefaultSidebarLayout();
    for (const href of missingHrefs) {
      const meta = registry.get(href);
      if (!meta) continue;
      let targetGroup = groups.find((group) => group.id === meta.defaultGroupId);
      if (!targetGroup) {
        const defaultGroup = defaultLayout.groups.find((group) => group.id === meta.defaultGroupId);
        targetGroup = {
          id: meta.defaultGroupId,
          label: defaultGroup?.label ?? meta.defaultGroupId,
          linkHrefs: [],
        };
        groups.push(targetGroup);
      }
      targetGroup.linkHrefs.push(href);
    }
  }

  return {
    groups: groups.filter((group) => group.linkHrefs.length > 0 || group.label.trim()),
  };
}

export function mergeLayoutWithDefaults(
  saved: SidebarLayout | null,
  legacySettingsOrder: string[] | null,
): SidebarLayout {
  const registry = buildLinkRegistry();
  const defaults = getDefaultSidebarLayout();

  if (!saved) {
    if (!legacySettingsOrder || legacySettingsOrder.length === 0) {
      return defaults;
    }

    const settingsGroup = defaults.groups.find((group) => group.id === "settings");
    if (!settingsGroup) {
      return defaults;
    }

    const settingsHrefs = new Set(settingsGroup.linkHrefs);
    const orderedSettings = legacySettingsOrder.filter((href) => settingsHrefs.has(href));
    const remainingSettings = settingsGroup.linkHrefs.filter(
      (href) => !orderedSettings.includes(href),
    );

    return normalizeSidebarLayout(
      {
        groups: defaults.groups.map((group) =>
          group.id === "settings"
            ? { ...group, linkHrefs: [...orderedSettings, ...remainingSettings] }
            : group,
        ),
      },
      registry,
    );
  }

  return normalizeSidebarLayout(saved, registry);
}

export function getSettingsLinksOrderFromLayout(layout: SidebarLayout | null): string[] {
  const settingsHrefs = new Set(SETTINGS_LINK_DEFINITIONS.map((link) => link.href));
  const ordered: string[] = [];

  if (layout) {
    for (const group of layout.groups) {
      for (const href of group.linkHrefs) {
        if (settingsHrefs.has(href) && !ordered.includes(href)) {
          ordered.push(href);
        }
      }
    }
  }

  for (const link of SETTINGS_LINK_DEFINITIONS) {
    if (!ordered.includes(link.href)) {
      ordered.push(link.href);
    }
  }

  return ordered;
}

export function createEmptySidebarGroup(existingGroups: SidebarLayoutGroup[]): SidebarLayoutGroup {
  let index = existingGroups.length + 1;
  let id = `custom-group-${index}`;
  while (existingGroups.some((group) => group.id === id)) {
    index += 1;
    id = `custom-group-${index}`;
  }

  return {
    id,
    label: `New group ${index}`,
    linkHrefs: [],
  };
}
