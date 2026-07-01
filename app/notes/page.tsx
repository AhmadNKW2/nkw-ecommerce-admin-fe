"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "@/hooks/use-loading-router";
import { useLoading } from "../src/providers/loading-provider";
import { useNotes, useDeleteNote } from "../src/services/notes/hooks/use-notes";
import type { Note } from "../src/services/notes/types/note.types";
import { PageHeader } from "../src/components/common/PageHeader";
import { Card } from "../src/components/ui/card";
import { Button } from "../src/components/ui/button";
import { Input } from "../src/components/ui/input";
import { IconButton } from "../src/components/ui/icon-button";
import { EmptyState } from "../src/components/common/EmptyState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../src/components/ui/table";
import type { PaginationData } from "../src/components/ui/pagination";
import { DeleteConfirmationModal } from "../src/components/common/DeleteConfirmationModal";
import { PAGINATION } from "../src/lib/constants";
import { StickyNote } from "lucide-react"; // Using StickyNote icon for Notes
import { NoteViewModal } from "../src/components/notes/NoteViewModal";

export default function NotesPage() {
  const router = useRouter();
  const { setShowOverlay } = useLoading();
  const [search, setSearch] = useState("");
  const [noteToDelete, setNoteToDelete] = useState<Note | null>(null);
  const [noteToView, setNoteToView] = useState<Note | null>(null);
  const [page, setPage] = useState<number>(PAGINATION.defaultPage);
  const [pageSize, setPageSize] = useState<number>(PAGINATION.defaultPageSize);

  const { data, isLoading, isError, error, refetch } = useNotes({ page, per_page: pageSize, search });
  const deleteNote = useDeleteNote();

  useEffect(() => {
    setShowOverlay(isLoading);
  }, [isLoading, setShowOverlay]);

  // Reset to first page when search changes
  useEffect(() => { setPage(1); }, [search]);

  // Handle case where data might not match NoteListResponse exactly yet
  const notes = (data?.items ?? data ?? []) as Note[];
  const total = data?.total ?? notes.length;
  
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  
  const paginationData: PaginationData = {
    currentPage: page,
    pageSize,
    totalItems: total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };

  const handleConfirmDelete = async () => {
    if (!noteToDelete) return;
    try {
      await deleteNote.mutateAsync(noteToDelete.id);
    } finally {
      setNoteToDelete(null);
    }
  };

  return (
    <div className="flex flex-col justify-center items-center gap-5 p-5">
      <PageHeader
        icon={<StickyNote />}
        title="Notes"
        description="Manage customer and product notes"
      />

      <Card>
        <Input
          label="Search notes"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          isSearch
        />
      </Card>

      {isError ? (
        <Card>
          <EmptyState
            icon={<StickyNote />}
            title="Failed to load notes"
            description={(error as any)?.message || "Please try again."}
          />
          <div className="flex justify-center">
            <Button onClick={() => refetch()} color="var(--color-primary)">Retry</Button>
          </div>
        </Card>
      ) : notes.length === 0 ? (
        <Card>
          <EmptyState
            icon={<StickyNote />}
            title="No notes found"
            description={search ? "No notes match your search." : "No notes have been added yet."}
          />
        </Card>
      ) : (
        <Table
          pagination={paginationData}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
        >
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">ID</TableHead>
              <TableHead>Guest/User</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Product</TableHead>
              <TableHead>Note</TableHead>
              <TableHead className="w-28">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {notes.map((note) => {
              return (
                <TableRow key={note.id} className="hover:bg-primary/5 cursor-pointer">
                  <TableCell className="font-mono text-sm text-gray-500">#{note.id}</TableCell>
                  <TableCell>
                    <div className="font-semibold">{note.guest_name || ((note as any).user ? `${(note as any).user.firstName} ${(note as any).user.lastName}` : note.user_id) || "Unknown"}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {(note.guest_email || (note as any).user?.email) && <div>{note.guest_email || (note as any).user?.email}</div>}
                      {(note.guest_phone || (note as any).user?.phone) && <div className="text-gray-500">{note.guest_phone || (note as any).user?.phone}</div>}
                      {!(note.guest_email || (note as any).user?.email) && !(note.guest_phone || (note as any).user?.phone) && "N/A"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-20 h-20 rounded border border-secondary overflow-hidden flex-shrink-0 bg-white">
                        <img
                          src={note.product?.image || (note.product as any)?.media?.find((m: any) => m.is_primary)?.url || (note.product as any)?.media?.[0]?.url || note.product?.primary_image?.url || 'https://placehold.co/400x400?text=No+Image'}
                          alt={note.product?.name_en || note.product?.name || 'Product Image'}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <span className="text-sm font-medium line-clamp-2 min-w-[120px] max-w-[200px]">
                        {note.product?.name_en || note.product?.name || note.product_id || "N/A"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[200px] sm:max-w-xs md:max-w-md lg:max-w-lg truncate" title={note.notes} dir="auto">
                      {note.notes || "-"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <IconButton
                        variant="view"
                        onClick={() => setNoteToView(note)}
                        title="View note details"

                      />
                      <IconButton
                        variant="delete"
                        onClick={() => setNoteToDelete(note)}
                        title="Delete note"
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <NoteViewModal isOpen={!!noteToView} onClose={() => setNoteToView(null)} note={noteToView} />

      {noteToDelete && (
        <DeleteConfirmationModal
          isOpen={true}
          onClose={() => setNoteToDelete(null)}
          onConfirm={handleConfirmDelete}
          title="Delete Note"
          message={`Are you sure you want to delete note #${noteToDelete.id}? This action cannot be undone.`}
          isLoading={deleteNote.isPending}
        />
      )}
    </div>
  );
}
