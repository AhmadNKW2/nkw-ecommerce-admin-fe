import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../../lib/query-keys";
import { showSuccessToast } from "../../../lib/toast";
import { partnerService } from "../api/partner.service";
import type {
  CreatePartnerDto,
  PartnerListParams,
  UpdatePartnerDto,
} from "../types/partner.types";

export const usePartners = (
  params?: PartnerListParams,
  options?: { enabled?: boolean },
) => {
  return useQuery({
    queryKey: queryKeys.partners.list(params),
    queryFn: () => partnerService.listPartners(params),
    enabled: options?.enabled ?? true,
    select: (response) => response.data,
  });
};

export const usePartner = (id: number, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: queryKeys.partners.detail(id),
    queryFn: () => partnerService.getPartner(id),
    enabled: options?.enabled ?? !!id,
    select: (response) => response.data,
  });
};

export const useCreatePartner = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePartnerDto) => partnerService.createPartner(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.partners.all });
      showSuccessToast("Partner created successfully");
    },
  });
};

export const useUpdatePartner = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdatePartnerDto }) =>
      partnerService.updatePartner(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.partners.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.partners.detail(variables.id) });
      showSuccessToast("Partner updated successfully");
    },
  });
};

export const useDeletePartner = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => partnerService.deletePartner(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.partners.all });
      showSuccessToast("Partner deleted successfully");
    },
  });
};