import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../../lib/query-keys";
import { showSuccessToast } from "../../../lib/toast";
import { noteService } from "../api/note.service";
import type { NoteListParams } from "../types/note.types";

export const useNotes = (
  params?: NoteListParams,
  options?: { enabled?: boolean },
) => {
  return useQuery({
    queryKey: queryKeys.notes.list(params),
    queryFn: () => noteService.listNotes(params),
    enabled: options?.enabled ?? true,
    select: (response: any) => response?.data ?? response,
  });
};

export const useNote = (id: number, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.notes.detail(id),
    queryFn: () => noteService.getNote(id),
    enabled: options?.enabled ?? !!id,
    select: (response: any) => response?.data ?? response,
  });
};

export const useDeleteNote = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => noteService.deleteNote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notes.lists() });
      showSuccessToast("Note deleted successfully");
    },
  });
};
