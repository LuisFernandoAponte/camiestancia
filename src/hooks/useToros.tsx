import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api.js";

export interface Toro {
  id: string;
  bovinoId: string;
  codigo: string | null;
  nombre: string;
  raza: string | null;
  fechaNacimiento: string | null;
  fechaEvaluacion: string | null;
  pesoEvaluacion: number | null;
  circunferenciaEscrotal: number | null;
  calidadSeminal: string | null;
  categoria: string | null;
  activo: boolean;
  descartado: boolean;
  motivoDescarte: string | null;
  observaciones: string | null;
  chipBovino: string | null;
  nombreBovino: string | null;
  totalServicios: number;
}

export interface ToroCreateInput {
  bovinoId: string;
  codigo?: string;
  nombre: string;
  raza?: string;
  fechaNacimiento?: string;
  fechaEvaluacion?: string;
  pesoEvaluacion?: number;
  circunferenciaEscrotal?: number;
  calidadSeminal?: string;
  categoria?: string;
  activo?: boolean;
  descartado?: boolean;
  motivoDescarte?: string;
  observaciones?: string;
}

export function useToros(page: number = 1, limit: number = 200, filters: Record<string, string> = {}) {
  return useQuery({
    queryKey: ["toros", { page, limit, ...filters }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const response = await apiRequest<Toro[]>(`/api/toros?${params.toString()}`);
      if (!response.success) throw new Error(response.error?.message || "Error listando toros");
      return response;
    },
  });
}

export function useCreateToro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: ToroCreateInput) => {
      const response = await apiRequest<Toro>("/api/toros", {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!response.success) throw new Error(response.error?.message || "Error registrando toro");
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["toros"] });
    },
  });
}

export function useUpdateToro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ToroCreateInput> }) => {
      const response = await apiRequest<Toro>(`/api/toros/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      if (!response.success) throw new Error(response.error?.message || "Error actualizando toro");
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["toros"] });
    },
  });
}

export function useDeleteToro() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest(`/api/toros/${id}`, { method: "DELETE" });
      if (!response.success) throw new Error(response.error?.message || "Error eliminando toro");
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["toros"] });
    },
  });
}
