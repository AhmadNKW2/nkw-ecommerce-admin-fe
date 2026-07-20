"use client";

import { useEffect, useMemo, useState } from "react";
import {
    AlertCircle,
    ChevronDown,
    ChevronRight,
    ExternalLink,
    Layers,
    Pencil,
    Plus,
    RefreshCw,
    Tag,
    Trash2,
} from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Modal } from "../ui/modal";
import { DeleteConfirmationModal } from "../common/DeleteConfirmationModal";
import { CategoryTreeSelect } from "../products/CategoryTreeSelect";
import { showErrorToast } from "../../lib/toast";
import { cn } from "../../lib/utils";
import { useCategories } from "../../services/categories/hooks/use-categories";
import { Category } from "../../services/categories/types/category.types";
import {
    useCreateVendorCategory,
    useDeleteVendorCategory,
    useUpdateVendorCategory,
    useVendorCategoryTree,
} from "../../services/vendors/hooks/use-vendors";
import { VendorCategory } from "../../services/vendors/types/vendor.types";

interface VendorCategoryTreeSectionProps {
    mode: "create" | "edit";
    vendorId?: number;
}

type EditorMode = "create-child" | "edit";
type AssignmentFilter = "all" | "unassigned";
type CategoryScopeFilter = "all" | "leaf";

const ASSIGNMENT_FILTER_OPTIONS: { value: AssignmentFilter; label: string }[] = [
    { value: "all", label: "All assignments" },
    { value: "unassigned", label: "No categories assigned" },
];

const CATEGORY_SCOPE_FILTER_OPTIONS: { value: CategoryScopeFilter; label: string }[] = [
    { value: "all", label: "All categories" },
    { value: "leaf", label: "Leaf categories" },
];

interface TreeFilterGroupProps<T extends string> {
    label: string;
    value: T;
    options: { value: T; label: string }[];
    onChange: (value: T) => void;
}

const TreeFilterGroup = <T extends string>({
    label,
    value,
    options,
    onChange,
}: TreeFilterGroupProps<T>) => {
    return (
        <div className="flex min-w-0 flex-col gap-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                {label}
            </span>
            <div
                className="flex flex-wrap gap-1 rounded-2xl border border-primary/15 bg-white p-1"
                role="group"
                aria-label={label}
            >
                {options.map((option) => {
                    const isActive = option.value === value;

                    return (
                        <button
                            key={option.value}
                            type="button"
                            onClick={() => onChange(option.value)}
                            aria-pressed={isActive}
                            className={cn(
                                "rounded-xl px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap",
                                isActive
                                    ? "bg-primary text-white shadow-sm"
                                    : "text-gray-600 hover:bg-primary/5 hover:text-primary"
                            )}
                        >
                            {option.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

interface VendorCategoryFormState {
    title: string;
    referenceLink: string;
    parentId: string;
    categoryIds: string[];
}

interface VendorCategoryFormErrors {
    title?: string;
    referenceLink?: string;
    categoryIds?: string;
}

const createEmptyFormState = (): VendorCategoryFormState => ({
    title: "",
    referenceLink: "",
    parentId: "",
    categoryIds: [],
});

const findCategoryInTree = (
    categories: Category[],
    categoryId: number
): Category | undefined => {
    for (const category of categories) {
        if (category.id === categoryId) {
            return category;
        }

        if (category.children?.length) {
            const childMatch = findCategoryInTree(category.children, categoryId);
            if (childMatch) {
                return childMatch;
            }
        }
    }

    return undefined;
};

const findVendorCategoryInTree = (
    nodes: VendorCategory[],
    categoryId: number
): VendorCategory | undefined => {
    for (const node of nodes) {
        if (node.id === categoryId) {
            return node;
        }

        if (node.children?.length) {
            const childMatch = findVendorCategoryInTree(node.children, categoryId);
            if (childMatch) {
                return childMatch;
            }
        }
    }

    return undefined;
};

const getResolvedCategoryList = (
    node: VendorCategory | null | undefined,
    categories: Category[]
): Category[] => {
    if (!node) {
        return [];
    }

    const resolvedFromNode = Array.isArray(node.categories) ? node.categories : [];
    const fallbackCategories = Array.isArray(node.category_ids)
        ? node.category_ids
            .map((categoryId) => findCategoryInTree(categories, categoryId))
            .filter((category): category is Category => Boolean(category))
        : [];

    const merged = [...resolvedFromNode, ...fallbackCategories];
    const seenIds = new Set<number>();

    return merged.filter((category) => {
        if (seenIds.has(category.id)) {
            return false;
        }

        seenIds.add(category.id);
        return true;
    });
};

const getVendorCategoryReferenceLink = (
    node: VendorCategory | null | undefined
): string => {
    if (!node) {
        return "";
    }

    const referenceLink = node.reference_link ?? node.url ?? "";
    return typeof referenceLink === "string" ? referenceLink : "";
};

const getAssignedStoreCategories = (
    node: VendorCategory | null | undefined,
    categories: Category[]
): Category[] => {
    if (!node) {
        return [];
    }

    const primaryCategoryId = Number.isFinite(node.category_id) ? node.category_id : null;

    return getResolvedCategoryList(node, categories).filter(
        (category) => primaryCategoryId === null || category.id !== primaryCategoryId
    );
};

const getAssignedStoreCategoryIds = (
    node: VendorCategory | null | undefined,
    categories: Category[]
): number[] => {
    return getAssignedStoreCategories(node, categories).map((category) => category.id);
};

const isLeafVendorCategory = (node: VendorCategory): boolean => {
    return !node.children?.length;
};

const hasNoCategoriesAssigned = (
    node: VendorCategory,
    categories: Category[]
): boolean => {
    return getAssignedStoreCategories(node, categories).length === 0;
};

const nodeMatchesSearch = (
    node: VendorCategory,
    normalizedQuery: string,
    categories: Category[]
): boolean => {
    if (!normalizedQuery) {
        return true;
    }

    const categoryNames = getResolvedCategoryList(node, categories).map((category) =>
        category.name_en.toLowerCase()
    );
    const referenceLink = getVendorCategoryReferenceLink(node);

    return [node.title, referenceLink, ...categoryNames].some((value) =>
        value.toLowerCase().includes(normalizedQuery)
    );
};

const filterVendorCategoryTree = (
    nodes: VendorCategory[],
    searchTerm: string,
    categories: Category[],
    assignmentFilter: AssignmentFilter = "all",
    categoryScopeFilter: CategoryScopeFilter = "all"
): VendorCategory[] => {
    const normalizedQuery = searchTerm.trim().toLowerCase();

    // Leaf mode returns a flat list of matching leaves only (no parent wrappers).
    if (categoryScopeFilter === "leaf") {
        return nodes.flatMap((node) => {
            if (!isLeafVendorCategory(node)) {
                return filterVendorCategoryTree(
                    node.children || [],
                    normalizedQuery,
                    categories,
                    assignmentFilter,
                    categoryScopeFilter
                );
            }

            const matchesAssignment =
                assignmentFilter === "all" ||
                hasNoCategoriesAssigned(node, categories);
            const matchesSearch = nodeMatchesSearch(node, normalizedQuery, categories);

            if (matchesAssignment && matchesSearch) {
                return [{ ...node, children: [] }];
            }

            return [];
        });
    }

    return nodes.flatMap((node) => {
        const filteredChildren = filterVendorCategoryTree(
            node.children || [],
            normalizedQuery,
            categories,
            assignmentFilter,
            categoryScopeFilter
        );
        const matchesAssignment =
            assignmentFilter === "all" ||
            hasNoCategoriesAssigned(node, categories);
        const matchesSearch = nodeMatchesSearch(node, normalizedQuery, categories);
        const matchesNode = matchesAssignment && matchesSearch;

        if (matchesNode) {
            // Unassigned filter: keep only matching descendants under a match.
            if (assignmentFilter === "unassigned") {
                return [{ ...node, children: filteredChildren }];
            }

            return [node];
        }

        if (filteredChildren.length > 0) {
            return [{ ...node, children: filteredChildren }];
        }

        return [];
    });
};

const buildOriginalChildCountMap = (
    nodes: VendorCategory[],
    map: Map<number, number> = new Map()
): Map<number, number> => {
    for (const node of nodes) {
        map.set(node.id, node.children?.length ?? 0);
        if (node.children?.length) {
            buildOriginalChildCountMap(node.children, map);
        }
    }

    return map;
};

const getErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error && error.message) {
        return error.message;
    }

    return fallback;
};

interface VendorCategoryTreeNodeProps {
    node: VendorCategory;
    categories: Category[];
    originalChildCountById: Map<number, number>;
    onEdit: (node: VendorCategory) => void;
    onDelete: (node: VendorCategory) => void;
    onPreviewReferenceLink: (referenceLink: string) => void;
    forceExpanded: boolean;
}

const VendorCategoryTreeNode: React.FC<VendorCategoryTreeNodeProps> = ({
    node,
    categories,
    originalChildCountById,
    onEdit,
    onDelete,
    onPreviewReferenceLink,
    forceExpanded,
}) => {
    const assignedCategories = getAssignedStoreCategories(node, categories);
    const visibleChildren = node.children ?? [];
    const hasVisibleChildren = visibleChildren.length > 0;
    const originalChildCount = originalChildCountById.get(node.id) ?? visibleChildren.length;
    const referenceLink = getVendorCategoryReferenceLink(node);
    const [isExpanded, setIsExpanded] = useState(false);

    const toggleExpanded = () => {
        if (hasVisibleChildren) {
            setIsExpanded((current) => !current);
        }
    };

    useEffect(() => {
        if (forceExpanded) {
            setIsExpanded(true);
        }
    }, [forceExpanded]);

    return (
        <div className="space-y-0">
            <div
                className={`group w-full rounded-[22px] border border-primary/10 bg-white p-4 text-left transition-all duration-200 hover:border-primary/30 hover:bg-primary/5 ${hasVisibleChildren ? "cursor-pointer" : ""}`}
                onClick={toggleExpanded}
                onKeyDown={(event) => {
                    if (!hasVisibleChildren) {
                        return;
                    }

                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        toggleExpanded();
                    }
                }}
                role={hasVisibleChildren ? "button" : undefined}
                tabIndex={hasVisibleChildren ? 0 : undefined}
                aria-expanded={hasVisibleChildren ? isExpanded : undefined}
                aria-label={hasVisibleChildren ? `${isExpanded ? "Collapse" : "Expand"} ${node.title}` : undefined}
            >
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 text-left">
                        <div className="flex flex-wrap items-center gap-2">
                            {hasVisibleChildren ? (
                                <ChevronRight
                                    className={`h-4 w-4 shrink-0 text-primary transition-transform duration-300 ease-out ${isExpanded ? "rotate-90" : "rotate-0"}`}
                                />
                            ) : null}
                            <h3 className="text-lg font-semibold text-gray-900">{node.title}</h3>
                            <span className="inline-flex items-center rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
                                {originalChildCount} child{originalChildCount === 1 ? "" : "ren"}
                            </span>
                            {assignedCategories.length > 0 ? (
                                assignedCategories.map((category) => (
                                    <Badge key={category.id} variant="default2" className="max-w-full">
                                        <span className="truncate">{category.name_en}</span>
                                    </Badge>
                                ))
                            ) : (
                                <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                                    No categories assigned
                                </span>
                            )}
                            {!referenceLink.trim() ? (
                                <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                                    No reference link
                                </span>
                            ) : null}
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5 self-start">
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                onPreviewReferenceLink(referenceLink);
                            }}
                            className="rounded-full border border-primary/15 bg-white p-2 transition-colors hover:border-primary/40 hover:bg-primary/5"
                            aria-label={`Preview ${node.title}`}
                            disabled={!referenceLink.trim()}
                        >
                            <ExternalLink className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                onEdit(node);
                            }}
                            className="rounded-full border border-primary/15 bg-white p-2 transition-colors hover:border-primary/40 hover:bg-primary/5"
                            aria-label={`Edit ${node.title}`}
                        >
                            <Pencil className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                onDelete(node);
                            }}
                            className="rounded-full border border-primary/15 bg-white p-2 transition-colors hover:border-primary/40 hover:bg-primary/5"
                            aria-label={`Delete ${node.title}`}
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            {hasVisibleChildren && (
                <div
                    className={`grid transition-[grid-template-rows,opacity,margin-top] duration-300 ease-out ${isExpanded ? "mt-3 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0"}`}
                    aria-hidden={!isExpanded}
                >
                    <div className="overflow-hidden">
                        <div className="ml-4 border-l border-primary/15 pl-4 sm:ml-6 sm:pl-5">
                            <div className={`space-y-3 transition-transform duration-300 ease-out ${isExpanded ? "translate-y-0" : "-translate-y-1 pointer-events-none"}`}>
                                {visibleChildren.map((child) => (
                                    <VendorCategoryTreeNode
                                        key={child.id}
                                        node={child}
                                        categories={categories}
                                        originalChildCountById={originalChildCountById}
                                        onEdit={onEdit}
                                        onDelete={onDelete}
                                        onPreviewReferenceLink={onPreviewReferenceLink}
                                        forceExpanded={forceExpanded}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export const VendorCategoryTreeSection: React.FC<VendorCategoryTreeSectionProps> = ({
    mode,
    vendorId,
}) => {
    const isDisabled = mode === "create" || !vendorId;
    const { data: categories = [], isLoading: isCategoriesLoading } = useCategories();
    const {
        data: categoryTree = [],
        isLoading: isTreeLoading,
        isError: isTreeError,
        error: treeError,
        refetch,
    } = useVendorCategoryTree(vendorId || 0, { enabled: !isDisabled });

    const [searchQuery, setSearchQuery] = useState("");
    const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>("all");
    const [categoryScopeFilter, setCategoryScopeFilter] = useState<CategoryScopeFilter>("all");
    const [editorMode, setEditorMode] = useState<EditorMode>("create-child");
    const [editorCategoryId, setEditorCategoryId] = useState<number | null>(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editorForm, setEditorForm] = useState<VendorCategoryFormState>(createEmptyFormState);
    const [editorErrors, setEditorErrors] = useState<VendorCategoryFormErrors>({});
    const [deleteTarget, setDeleteTarget] = useState<VendorCategory | null>(null);

    const createVendorCategory = useCreateVendorCategory();
    const updateVendorCategory = useUpdateVendorCategory();
    const deleteVendorCategory = useDeleteVendorCategory();

    const hasActiveTreeFilters =
        searchQuery.trim().length > 0 ||
        assignmentFilter !== "all" ||
        categoryScopeFilter !== "all";

    const filteredTree = useMemo(
        () =>
            filterVendorCategoryTree(
                categoryTree,
                searchQuery,
                categories,
                assignmentFilter,
                categoryScopeFilter
            ),
        [assignmentFilter, categories, categoryScopeFilter, categoryTree, searchQuery]
    );

    const originalChildCountById = useMemo(
        () => buildOriginalChildCountMap(categoryTree),
        [categoryTree]
    );

    const editingNode = useMemo(() => {
        if (!editorCategoryId) {
            return null;
        }

        return findVendorCategoryInTree(categoryTree, editorCategoryId) || null;
    }, [categoryTree, editorCategoryId]);

    const parentNode = useMemo(() => {
        if (!editorForm.parentId) {
            return null;
        }

        return findVendorCategoryInTree(categoryTree, Number(editorForm.parentId)) || null;
    }, [categoryTree, editorForm.parentId]);

    const openEditEditor = (node: VendorCategory) => {
        const categoryIds = getAssignedStoreCategoryIds(node, categories).map((categoryId) => categoryId.toString());

        setEditorMode("edit");
        setEditorCategoryId(node.id);
        setEditorErrors({});
        setEditorForm({
            title: node.title,
            referenceLink: getVendorCategoryReferenceLink(node),
            parentId: node.parent_id ? node.parent_id.toString() : "",
            categoryIds,
        });
        setIsEditorOpen(true);
    };

    const closeEditor = () => {
        setIsEditorOpen(false);
        setEditorCategoryId(null);
        setEditorErrors({});
    };

    const validateEditorForm = () => {
        const nextErrors: VendorCategoryFormErrors = {};

        if (editorMode === "create-child" && !editorForm.title.trim()) {
            nextErrors.title = "Title is required.";
        }

        if (editorMode === "create-child" && !editorForm.referenceLink.trim()) {
            nextErrors.referenceLink = "Reference link is required.";
        }

        setEditorErrors(nextErrors);
        return Object.keys(nextErrors).length === 0;
    };

    const handlePreviewReferenceLink = (referenceLink: string) => {
        try {
            const normalizedUrl = /^https?:\/\//i.test(referenceLink)
                ? referenceLink
                : referenceLink.startsWith("/")
                    ? referenceLink
                    : `/${referenceLink.replace(/^\/+/, "")}`;
            window.open(normalizedUrl, "_blank", "noopener,noreferrer");
        } catch (error) {
            showErrorToast(getErrorMessage(error, "Failed to preview the vendor category reference link."));
        }
    };

    const handleSaveCategory = async () => {
        if (!vendorId || !validateEditorForm()) {
            return;
        }

        const selectedCategoryIds = Array.from(
            new Set(editorForm.categoryIds.map((categoryId) => Number(categoryId)).filter(Number.isFinite))
        );

        try {
            if (editorMode === "edit" && editorCategoryId) {
                await updateVendorCategory.mutateAsync({
                    vendorId,
                    categoryId: editorCategoryId,
                    data: {
                        category_ids: selectedCategoryIds,
                    },
                });
            } else {
                await createVendorCategory.mutateAsync({
                    vendorId,
                    data: {
                        title: editorForm.title.trim(),
                        reference_link: editorForm.referenceLink.trim(),
                        category_ids: selectedCategoryIds,
                        parent_id: editorForm.parentId ? Number(editorForm.parentId) : null,
                    },
                });
            }

            closeEditor();
        } catch (error) {
            showErrorToast(getErrorMessage(error, "Failed to save the vendor category."));
        }
    };

    const handleDeleteCategory = async () => {
        if (!vendorId || !deleteTarget) {
            return;
        }

        try {
            await deleteVendorCategory.mutateAsync({
                vendorId,
                categoryId: deleteTarget.id,
            });
            setDeleteTarget(null);
        } catch (error) {
            showErrorToast(getErrorMessage(error, "Failed to delete the vendor category."));
        }
    };

    return (
        <>
            <Card className="overflow-hidden border border-primary/10 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_34%),linear-gradient(180deg,rgba(255,255,255,1),rgba(248,250,255,0.96))]">
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex items-start gap-3">
                            <div className="rounded-[20px] bg-primary/10 p-3 text-primary">
                                <Layers className="h-5 w-5" />
                            </div>
                            <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-lg font-semibold">Vendor Category Tree</h2>
                                </div>
                                <p className="max-w-3xl text-sm leading-6 text-gray-600">
                                    Organize vendor-facing categories as a simple tree with inline actions and quick category visibility.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                            {!isDisabled && (
                                <Button
                                    variant="outline"
                                    onClick={() => refetch()}
                                    disabled={isTreeLoading || createVendorCategory.isPending || updateVendorCategory.isPending}
                                >
                                    <span className="flex items-center gap-2">
                                        <RefreshCw className="h-4 w-4" />
                                        Refresh Tree
                                    </span>
                                </Button>
                            )}
                        </div>
                    </div>

                    {isDisabled ? (
                        <div className="rounded-3xl border border-dashed border-primary/20 bg-white/70 p-8 text-center">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <Layers className="h-6 w-6" />
                            </div>
                            <h3 className="mt-4 text-lg font-semibold text-gray-900">Save the vendor first</h3>
                            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-600">
                                The vendor category tree is tied to a saved vendor record. Once the vendor exists, you can build a navigation tree, add reference links, and map store categories here.
                            </p>
                        </div>
                    ) : isTreeError ? (
                        <div className="rounded-3xl border border-danger/20 bg-danger/5 p-6">
                            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                <div className="flex items-start gap-3">
                                    <div className="rounded-full bg-danger/10 p-3 text-danger">
                                        <AlertCircle className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-900">Unable to load vendor categories</h3>
                                        <p className="mt-1 text-sm text-gray-600">
                                            {getErrorMessage(treeError, "The vendor category tree could not be loaded.")}
                                        </p>
                                    </div>
                                </div>

                                <Button variant="outline" onClick={() => refetch()}>
                                    <span className="flex items-center gap-2">
                                        <RefreshCw className="h-4 w-4" />
                                        Try Again
                                    </span>
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4 rounded-[28px] border border-primary/10 bg-white/85 p-5 shadow-sm backdrop-blur-sm">
                            <div className="flex flex-col gap-4">
                                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                                    <div>
                                        <h3 className="text-base font-semibold text-gray-900">Categories</h3>
                                        <p className="text-sm text-gray-500">
                                            Manage the full vendor category tree in one place.
                                        </p>
                                    </div>

                                    <div className="w-full lg:max-w-md">
                                        <Input
                                            value={searchQuery}
                                            onChange={(event) => setSearchQuery(event.target.value)}
                                            placeholder="Search title, reference link, or category"
                                            isSearch
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                                    <TreeFilterGroup
                                        label="Assignment"
                                        value={assignmentFilter}
                                        options={ASSIGNMENT_FILTER_OPTIONS}
                                        onChange={setAssignmentFilter}
                                    />
                                    <TreeFilterGroup
                                        label="Scope"
                                        value={categoryScopeFilter}
                                        options={CATEGORY_SCOPE_FILTER_OPTIONS}
                                        onChange={setCategoryScopeFilter}
                                    />
                                </div>
                            </div>

                            {isTreeLoading ? (
                                <div className="space-y-3">
                                    {Array.from({ length: 3 }).map((_, index) => (
                                        <div
                                            key={index}
                                            className="h-40 animate-pulse rounded-[22px] border border-primary/10 bg-primary/5"
                                        />
                                    ))}
                                </div>
                            ) : filteredTree.length === 0 ? (
                                categoryTree.length === 0 ? (
                                    <div className="rounded-3xl border border-dashed border-primary/20 bg-primary/5 p-10 text-center">
                                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-primary shadow-sm">
                                            <Tag className="h-6 w-6" />
                                        </div>
                                        <h4 className="mt-4 text-lg font-semibold text-gray-900">No vendor categories available</h4>
                                        <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-gray-600">
                                            No vendor category nodes are available for this vendor right now.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="rounded-3xl border border-dashed border-primary/20 bg-primary/5 p-8 text-center text-sm text-gray-600">
                                        No categories match your filters. Try adjusting search, assignment, or leaf scope.
                                    </div>
                                )
                            ) : (
                                <div className="space-y-4">
                                    {filteredTree.map((node) => (
                                        <VendorCategoryTreeNode
                                            key={node.id}
                                            node={node}
                                            categories={categories}
                                            originalChildCountById={originalChildCountById}
                                            onEdit={openEditEditor}
                                            onDelete={setDeleteTarget}
                                            onPreviewReferenceLink={handlePreviewReferenceLink}
                                            forceExpanded={hasActiveTreeFilters && categoryScopeFilter !== "leaf"}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </Card>

            <Modal
                isOpen={isEditorOpen}
                onClose={closeEditor}
                className="w-full max-w-5xl self-start mt-4 sm:mt-6"
                contentClassName="w-full items-stretch gap-6 p-6 md:p-8"
            >
                <div className="flex w-full items-start gap-3">
                    <div className="rounded-[20px] bg-primary/10 p-3 text-primary">
                        {editorMode === "edit" ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-xl font-semibold text-gray-900">
                            {editorMode === "edit" ? "Edit Vendor Category" : "Add Child Category"}
                        </h3>
                        <p className="mt-1 text-sm text-gray-600">
                            {editorMode === "edit"
                                ? "Update only the mapped store categories assigned to this vendor category."
                                : "Define the vendor-facing title and reference link, then choose the store categories mapped to this child node."}
                        </p>
                    </div>
                </div>

                {editorMode === "create-child" ? (
                    <>
                        <div className="grid w-full gap-5 md:grid-cols-2">
                            <Input
                                label="Title"
                                value={editorForm.title}
                                onChange={(event) =>
                                    setEditorForm((current) => ({ ...current, title: event.target.value }))
                                }
                                error={editorErrors.title}
                                required
                            />
                            <div className="rounded-[22px] border border-primary/10 bg-primary/5 px-4 py-3">
                                <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                                    Parent Category
                                </span>
                                <p className="mt-1 text-sm font-semibold text-gray-900">
                                    {parentNode?.title || "Selected parent"}
                                </p>
                            </div>
                        </div>
                        <Input
                            label="Reference Link"
                            value={editorForm.referenceLink}
                            onChange={(event) =>
                                setEditorForm((current) => ({ ...current, referenceLink: event.target.value }))
                            }
                            error={editorErrors.referenceLink}
                            required
                        />
                    </>
                ) : null}

                <div className="grid w-full gap-5">
                    <CategoryTreeSelect
                        label="Mapped Categories"
                        categories={categories}
                        selectedIds={editorForm.categoryIds}
                        onChange={(ids) =>
                            setEditorForm((current) => ({
                                ...current,
                                categoryIds: Array.from(new Set(ids.filter(Boolean))),
                            }))
                        }
                        error={editorErrors.categoryIds}
                        disabled={isCategoriesLoading}
                    />
                </div>

                <div className="flex w-full flex-wrap justify-end gap-3">
                    <Button variant="outline" onClick={closeEditor}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSaveCategory}
                        disabled={createVendorCategory.isPending || updateVendorCategory.isPending}
                    >
                        <span className="flex items-center gap-2">
                            {createVendorCategory.isPending || updateVendorCategory.isPending ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                                <Tag className="h-4 w-4" />
                            )}
                            {editorMode === "edit" ? "Save Mapping" : "Create Category"}
                        </span>
                    </Button>
                </div>
            </Modal>

            <DeleteConfirmationModal
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDeleteCategory}
                title="Delete vendor category?"
                message={`Delete ${deleteTarget?.title || "this category"} from the vendor tree?`}
                confirmText="Delete Category"
                isLoading={deleteVendorCategory.isPending}
            />
        </>
    );
};