"use client";

/**
 * Banner List Page Component
 */

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "@/hooks/use-loading-router";
import { useSessionStoragePage } from "@/hooks/use-session-storage-page";
import { useLoading } from "../src/providers/loading-provider";
import {
    useBanners,
    useDeleteBanner,
    useReorderBanners,
} from "../src/services/banners/hooks/use-banners";
import { ImageIcon, GripVertical } from "lucide-react";
import { PageHeader } from "../src/components/common/PageHeader";
import { EmptyState } from "../src/components/common/EmptyState";
import { Badge } from "../src/components/ui/badge";
import { IconButton } from "../src/components/ui/icon-button";
import { Input } from "../src/components/ui/input";
import { Pagination } from "../src/components/ui/pagination";
import { PAGINATION } from "../src/lib/constants";
import { RadioCard } from "../src/components/ui/radio-card";
import { FiltersCard } from "../src/components/common/FiltersCard";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../src/components/ui/table";
import { DeleteConfirmationModal } from "../src/components/common/DeleteConfirmationModal";
import { Banner } from "../src/types/banners/banner.types";
import Image from "next/image";

// DnD Kit imports
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
    MeasuringStrategy,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Sortable Row Component
const SortableRow: React.FC<{
    banner: Banner;
    onEdit: (banner: Banner) => void;
    onDelete: (banner: Banner) => void;
}> = ({ banner, onEdit, onDelete }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: banner.id });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition: "transform 250ms cubic-bezier(0.25, 1, 0.5, 1), opacity 200ms ease",
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 50 : undefined,
        position: isDragging ? 'relative' : undefined,
    };

    return (

        <TableRow
            ref={setNodeRef}
            style={style}
            className={isDragging ? 'bg-primary/5 shadow-lg ring-2 ring-primary rounded-lg' : ''}
        >
            <TableCell className="w-12 font-mono text-sm text-center">
                {banner.sort_order}
            </TableCell>
            <TableCell className="w-12">
                <div
                    className={`cursor-grab active:cursor-grabbing p-2 rounded-lg transition-all duration-200 inline-flex ${isDragging
                        ? 'bg-primary/20 shadow-sm'
                        : 'hover:bg-primary/10 hover:shadow-sm'
                        }`}
                    {...attributes}
                    {...listeners}
                >
                    <GripVertical className={`h-5 w-5 transition-colors duration-200 ${isDragging ? 'text-primary' : 'text-primary/50'
                        }`} />
                </div>
            </TableCell>
            <TableCell>
                <div className="relative h-12 w-24 overflow-hidden rounded-md border border-primary/20 bg-muted">
                    {banner.image ? (
                        <Image
                            src={banner.image}
                            alt="Banner Image"
                            fill
                            className="object-cover"
                        />
                    ) : (
                        <div className="flex h-full w-full items-center justify-center">
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                    )}
                </div>
            </TableCell>
            <TableCell>
                <Badge
                    variant={
                        banner.visible ? "success" : "danger"
                    }
                >
                    {banner.visible ? "Visible" : "Hidden"}
                </Badge>
            </TableCell>
            <TableCell>
                <div className="flex items-center gap-2">
                    <Image
                        src={banner.language === "ar" ? "/ar.svg" : "/en.svg"}
                        alt={banner.language === "ar" ? "Arabic" : "English"}
                        width={35}
                        height={35}
                        className="shrink-0"
                    />
                </div>
            </TableCell>
            <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                    <IconButton
                        variant="edit"
                        href={`/banners/${banner.id}`}
                        onClick={(e) => e.stopPropagation()}
                        title="Edit"
                    />
                    <IconButton
                        variant="delete"
                        onClick={() => onDelete(banner)}
                        title="Delete"
                    />
                </div>
            </TableCell>
        </TableRow>
    );
};

export default function BannerListPage() {
    const router = useRouter();
    const { setShowOverlay } = useLoading();
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [bannerToDelete, setBannerToDelete] = useState<Banner | null>(null);
    const [items, setItems] = useState<Banner[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [languageFilter, setLanguageFilter] = useState<"" | "en" | "ar">("");
    const { page: storedPage, setPage: setStoredPage, limit: storedLimit, setLimit: setStoredLimit } = useSessionStoragePage("banners");
    const [queryParams, setQueryParams] = useState<{
        page: number;
        limit: number;
        search: string;
        language?: "en" | "ar";
    }>({
        page: storedPage,
        limit: storedLimit || PAGINATION.defaultPageSize,
        search: "",
    });

    // Persist current page to sessionStorage whenever it changes
    useEffect(() => {
        setStoredPage(queryParams.page ?? 1);
    }, [queryParams.page, setStoredPage]);

    // Persist current limit to sessionStorage whenever it changes
    useEffect(() => {
        if (queryParams.limit) setStoredLimit(queryParams.limit);
    }, [queryParams.limit, setStoredLimit]);

    const { data, isLoading } = useBanners(queryParams);
    const deleteBanner = useDeleteBanner();
    const reorderBanners = useReorderBanners();

    // Update items when data changes
    useEffect(() => {
        if (data?.data) {
            setItems(data.data);
        }
    }, [data]);

    const handleSearchChange = (value: string) => {
        setSearchTerm(value);
        const debounce = setTimeout(() => {
            if (value !== queryParams.search) {
                setQueryParams((prev) => ({ ...prev, search: value || "", page: 1 }));
            }
        }, 300);

        return () => clearTimeout(debounce);
    };

    const handleLanguageChange = (value: string) => {
        const lang = (value || "") as "" | "en" | "ar";
        setLanguageFilter(lang);
        setQueryParams((prev) => {
            const next = { ...prev, page: 1 } as typeof prev;
            if (lang) {
                next.language = lang;
            } else {
                delete (next as any).language;
            }
            return next;
        });
    };

    const handlePageChange = (page: number) => {
        setQueryParams((prev) => ({ ...prev, page }));
    };

    const handlePageSizeChange = (pageSize: number) => {
        setQueryParams((prev) => ({ ...prev, limit: pageSize, page: 1 }));
    };

    const hasActiveFilters = queryParams.search !== "" || !!queryParams.language;

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            // Compute new order once, then update state and fire API call outside the setter
            const oldIndex = items.findIndex((item) => item.id === active.id);
            const newIndex = items.findIndex((item) => item.id === over.id);

            const newItems = arrayMove(items, oldIndex, newIndex);
            setItems(newItems);

            const bannerIds = newItems.map((item) => item.id);
            reorderBanners.mutate(bannerIds);
        }
    };

    const handleEdit = (banner: Banner) => {
        router.push(`/banners/${banner.id}`);
    };

    const handleDeleteClick = (banner: Banner) => {
        setBannerToDelete(banner);
        setDeleteModalOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (bannerToDelete) {
            try {
                await deleteBanner.mutateAsync(bannerToDelete.id);
                setDeleteModalOpen(false);
                setBannerToDelete(null);
            } catch (error) {
                console.error("Failed to delete banner:", error);
            }
        }
    };

    // Show loading overlay while data is loading
    useEffect(() => {
        if (isLoading) {
            setShowOverlay(true);
        } else {
            setShowOverlay(false);
        }
    }, [isLoading, setShowOverlay]);

    return (
        <div className="admin-page">
            <PageHeader
                title="Banners"
                description="Manage your website banners"
                icon={<ImageIcon />}
                action={{
                    label: "Add Banner",
                    onClick: () => router.push("/banners/create"),
                }}
            />

            {/* Filters */}
            {(items.length > 0 || hasActiveFilters) && (
                <FiltersCard>
                    <div className="flex items-center gap-5">
                        <div className="relative flex-1">
                            <Input
                                value={searchTerm}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                label="Search"
                                variant="search"
                            />
                        </div>

                        <div className="w-full max-w-130">
                            <div className="space-y-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <RadioCard
                                        name="banner-language-filter"
                                        value="en"
                                        checked={languageFilter === "en"}
                                        onChange={() => handleLanguageChange("en")}
                                        label={
                                            <span className="inline-flex items-center gap-2">
                                                <Image src="/en.svg" alt="" aria-hidden width={18} height={18} />
                                                <span>English</span>
                                            </span>
                                        }
                                    />
                                    <RadioCard
                                        name="banner-language-filter"
                                        value="ar"
                                        checked={languageFilter === "ar"}
                                        onChange={() => handleLanguageChange("ar")}
                                        label={
                                            <span className="inline-flex items-center gap-2">
                                                <Image src="/ar.svg" alt="" aria-hidden width={18} height={18} />
                                                <span>Arabic</span>
                                            </span>
                                        }
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </FiltersCard>
            )}

            {items.length === 0 && !hasActiveFilters ? (
                <EmptyState
                    title="No banners found"
                    description="Get started by creating your first banner."
                    icon={<ImageIcon />}
                />
            ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                        measuring={{
                            droppable: {
                                strategy: MeasuringStrategy.Always,
                            },
                        }}
                    >
                        <Table
                            pagination={data?.meta ? {
                                currentPage: data.meta.page,
                                pageSize: data.meta.limit,
                                totalItems: data.meta.total,
                                totalPages: data.meta.totalPages,
                                hasNextPage: data.meta.page < data.meta.totalPages,
                                hasPreviousPage: data.meta.page > 1,
                            } : undefined}
                            onPageChange={handlePageChange}
                            onPageSizeChange={handlePageSizeChange}
                        >
                            <TableHeader>
                                <TableRow isHeader>
                                    <TableHead className="w-12">#</TableHead>
                                    <TableHead className="w-12">&nbsp;</TableHead>
                                    <TableHead>Image</TableHead>
                                    <TableHead>Visibility</TableHead>
                                    <TableHead>Language</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <SortableContext
                                    items={items.map((item) => item.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {items.map((banner) => (
                                        <SortableRow
                                            key={banner.id}
                                            banner={banner}
                                            onEdit={handleEdit}
                                            onDelete={handleDeleteClick}
                                        />
                                    ))}
                                </SortableContext>
                            </TableBody>
                        </Table>
                    </DndContext>
            )}

            <DeleteConfirmationModal
                isOpen={deleteModalOpen}
                onClose={() => setDeleteModalOpen(false)}
                onConfirm={handleDeleteConfirm}
                title="Delete Banner"
                message={`Are you sure you want to delete this banner? This action cannot be undone.`}
                isLoading={deleteBanner.isPending}
            />
        </div>
    );
};
