"use client";

import { useEffect, useMemo, useState } from "react";
import { FolderPlus, LayoutTemplate, RotateCcw, Trash2 } from "lucide-react";
import { PageHeader } from "../../src/components/common/PageHeader";
import { SettingsNav } from "../../src/components/settings/SettingsNav";
import { Card } from "../../src/components/ui/card";
import { Button } from "../../src/components/ui/button";
import { Input } from "../../src/components/ui/input";
import { Select } from "../../src/components/ui/select";
import { SortableList, DragHandle } from "../../src/components/ui/sortable-list";
import {
  useSidebarCustomization,
  type SidebarLayout,
  type SidebarLayoutGroup,
} from "../../src/hooks/use-sidebar-customization";
import {
  buildLinkRegistry,
  createEmptySidebarGroup,
  getDefaultSidebarLayout,
} from "../../src/lib/sidebar-layout";
import { showErrorToast, showSuccessToast } from "../../src/lib/toast";

type LayoutLinkItem = {
  id: string;
  href: string;
  label: string;
  featureToggle?: string;
};

type LayoutGroupItem = SidebarLayoutGroup & {
  id: string;
  links: LayoutLinkItem[];
};

function layoutToGroupItems(layout: SidebarLayout, registry: Map<string, { label: string; featureToggle?: string }>): LayoutGroupItem[] {
  return layout.groups.map((group) => ({
    ...group,
    links: group.linkHrefs.map((href) => ({
      id: href,
      href,
      label: registry.get(href)?.label ?? href,
      featureToggle: registry.get(href)?.featureToggle,
    })),
  }));
}

function groupItemsToLayout(groups: LayoutGroupItem[]): SidebarLayout {
  return {
    groups: groups.map((group) => ({
      id: group.id,
      label: group.label,
      linkHrefs: group.links.map((link) => link.href),
    })),
  };
}

export default function SidebarSettingsPage() {
  const registry = useMemo(() => buildLinkRegistry(), []);
  const { layout, isReady, saveLayout, resetLayout, isCustomized } = useSidebarCustomization();
  const [groups, setGroups] = useState<LayoutGroupItem[]>([]);
  const [hasChanged, setHasChanged] = useState(false);

  useEffect(() => {
    if (!isReady) return;
    setGroups(layoutToGroupItems(layout, registry));
    setHasChanged(false);
  }, [isReady, layout, registry]);

  const markChanged = (nextGroups: LayoutGroupItem[]) => {
    setGroups(nextGroups);
    setHasChanged(true);
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await saveLayout(groupItemsToLayout(groups));
      if (response.success) {
        showSuccessToast(response.message);
        setHasChanged(false);
      } else {
        showErrorToast(response.message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    const response = await resetLayout();
    if (response.success) {
      showSuccessToast(response.message);
      setGroups(layoutToGroupItems(getDefaultSidebarLayout(), registry));
      setHasChanged(false);
    } else {
      showErrorToast(response.message);
    }
  };

  const handleGroupReorder = (next: LayoutGroupItem[]) => {
    markChanged(next);
  };

  const handleGroupLabelChange = (groupId: string, label: string) => {
    markChanged(
      groups.map((group) => (group.id === groupId ? { ...group, label } : group)),
    );
  };

  const handleLinkReorder = (groupId: string, nextLinks: LayoutLinkItem[]) => {
    markChanged(
      groups.map((group) => (group.id === groupId ? { ...group, links: nextLinks } : group)),
    );
  };

  const handleMoveLink = (fromGroupId: string, href: string, toGroupId: string) => {
    if (fromGroupId === toGroupId) return;

    const movingLink = groups
      .find((group) => group.id === fromGroupId)
      ?.links.find((link) => link.href === href);
    if (!movingLink) return;

    markChanged(
      groups.map((group) => {
        if (group.id === fromGroupId) {
          return {
            ...group,
            links: group.links.filter((link) => link.href !== href),
          };
        }
        if (group.id === toGroupId) {
          return {
            ...group,
            links: [...group.links, movingLink],
          };
        }
        return group;
      }),
    );
  };

  const handleAddGroup = () => {
    const nextGroup = createEmptySidebarGroup(groups);
    markChanged([
      ...groups,
      {
        ...nextGroup,
        links: [],
      },
    ]);
  };

  const handleDeleteGroup = (groupId: string) => {
    if (groups.length <= 1) return;

    const targetGroup = groups.find((group) => group.id === groupId);
    if (!targetGroup) return;

    const remainingGroups = groups.filter((group) => group.id !== groupId);
    const firstGroup = remainingGroups[0];
    if (!firstGroup) return;

    markChanged(
      remainingGroups.map((group, index) =>
        index === 0
          ? { ...group, links: [...targetGroup.links, ...group.links] }
          : group,
      ),
    );
  };

  const groupOptions = groups.map((group) => ({
    value: group.id,
    label: group.label,
  }));

  return (
    <div className="admin-page">
      <PageHeader
        icon={<LayoutTemplate />}
        title="Sidebar Settings"
        description="Organize the full admin sidebar: create groups, rename them, reorder links, and move items between groups."
        action={{
          label: isSaving ? "Saving..." : hasChanged ? "Save layout" : "Saved",
          onClick: () => void handleSave(),
          disabled: !hasChanged || isSaving,
        }}
      />

      <SettingsNav />

      <Card className="w-full max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Full sidebar layout</h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Drag groups and links to customize navigation. Each link has spacing for easier
              scanning. Feature-gated links only appear when their feature is enabled.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              color="var(--color-primary2)"
              onClick={handleAddGroup}
              className="rounded-full px-4"
            >
              <FolderPlus className="mr-2 inline h-4 w-4" />
              Add group
            </Button>
            {isCustomized ? (
              <Button
                variant="outline"
                color="var(--color-primary2)"
                onClick={handleReset}
                className="rounded-full px-4"
              >
                <RotateCcw className="mr-2 inline h-4 w-4" />
                Reset
              </Button>
            ) : null}
          </div>
        </div>

        <div className="mt-6">
          {!isReady ? (
            <div className="space-y-6">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-40 animate-pulse rounded-2xl bg-gray-100" />
              ))}
            </div>
          ) : (
            <SortableList
              items={groups.map((group) => ({ ...group, id: group.id }))}
              onReorder={(next) => handleGroupReorder(next as LayoutGroupItem[])}
              className="space-y-6"
              renderItem={(group, _index, groupDrag) => (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5 shadow-sm">
                  <div className="mb-5 flex flex-wrap items-center gap-3">
                    <DragHandle dragHandleProps={groupDrag} />
                    <div className="min-w-0 flex-1">
                      <Input
                        label="Group name"
                        value={group.label}
                        onChange={(event) =>
                          handleGroupLabelChange(group.id, event.target.value)
                        }
                        className="max-w-sm bg-white"
                      />
                    </div>
                    {groups.length > 1 ? (
                      <Button
                        variant="outline"
                        color="#64748b"
                        onClick={() => handleDeleteGroup(group.id)}
                        className="rounded-full px-3 py-1.5 text-xs"
                      >
                        <Trash2 className="mr-1.5 inline h-3.5 w-3.5" />
                        Delete group
                      </Button>
                    ) : null}
                  </div>

                  {group.links.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
                      No links in this group yet. Move links here from another group.
                    </div>
                  ) : (
                    <SortableList
                      items={group.links}
                      onReorder={(next) => handleLinkReorder(group.id, next as LayoutLinkItem[])}
                      className="space-y-4"
                      renderItem={(link, _linkIndex, linkDrag) => (
                        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
                          <DragHandle dragHandleProps={linkDrag} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-900">{link.label}</p>
                            <p className="text-xs text-slate-400">{link.href}</p>
                            {link.featureToggle ? (
                              <p className="mt-1 text-xs text-slate-400">
                                Feature: {link.featureToggle.replace(/_enabled$/, "").replace(/_/g, " ")}
                              </p>
                            ) : null}
                          </div>
                          {groups.length > 1 ? (
                            <div className="w-48">
                              <Select
                                label="Move to"
                                value={group.id}
                                onChange={(value) =>
                                  handleMoveLink(
                                    group.id,
                                    link.href,
                                    Array.isArray(value) ? value[0] ?? group.id : value,
                                  )
                                }
                                options={groupOptions}
                                multiple={false}
                                search={groupOptions.length > 6}
                              />
                            </div>
                          ) : null}
                        </div>
                      )}
                    />
                  )}
                </div>
              )}
            />
          )}
        </div>
      </Card>
    </div>
  );
}
