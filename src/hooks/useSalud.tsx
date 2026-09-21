import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api.js";

export interface SaludEvent {
  id: string;
  animal_id: string;
  chip: string;
  nombre_animal: string;
  tipo: string;
  fecha: string;
  proxima_fecha: string | null;
  veterinario: string;
  estado: string;
  notas: string | null;
  created_at: string;
}

export interface SaludCreateInput {
  animal_id: string;
  tipo: string;
  fecha: string;
  proxima_fecha?: string;
  veterinario: string;
  estado?: string;
  notas?: string;
}

export function useSalud(
  page: number = 1,
  limit: number = 1000,
  filters: Record<string, string> = {},
) {
  return useQuery({
    queryKey: ["salud", { page, limit, ...filters }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const response = await apiRequest<SaludEvent[]>(`/api/salud?${params.toString()}`);
      if (!response.success) throw new Error(response.error?.message || "Error listando salud");
      return response;
    },
  });
}

export function useSaludDashboard() {
  return useQuery({
    queryKey: ["salud", "dashboard"],
    queryFn: async () => {
      const response = await apiRequest<{ total_eventos: number; pendientes: number; aplicadas_mes: number }>(
        "/api/salud/dashboard",
      );
      if (!response.success) throw new Error(response.error?.message || "Error cargando dashboard salud");
      return response.data;
    },
  });
}

export function useCreateSalud() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: SaludCreateInput) => {
      const response = await apiRequest<SaludEvent>("/api/salud", {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!response.success) {
        const details = response.error?.details?.map((d: any) => `${d.path}: ${d.message}`).join("; ");
        throw new Error(details || response.error?.message || "Error creando evento");
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salud"] });
    },
  });
}

export function useUpdateSalud() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SaludCreateInput> }) => {
      const response = await apiRequest<SaludEvent>(`/api/salud/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      if (!response.success) {
        const details = response.error?.details?.map((d: any) => `${d.path}: ${d.message}`).join("; ");
        throw new Error(details || response.error?.message || "Error actualizando evento");
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salud"] });
    },
  });
}

export function useDeleteSalud() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest(`/api/salud/${id}`, { method: "DELETE" });
      if (!response.success) {
        throw new Error(response.error?.message || "Error eliminando evento");
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salud"] });
    },
  });
}
