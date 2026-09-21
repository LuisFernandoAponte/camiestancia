import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api.js";

export interface ReproduccionEvent {
  id: string;
  hembraId: string;
  hembra: string;
  chipHembra: string | null;
  toroId?: string | null;
  toro?: string | null;
  chipToro?: string | null;
  padreId: string;
  padre: string;
  chipPadre: string | null;
  fechaInseminacion: string | null;
  cicloNumero?: number | null;
  resultado?: string | null;
  tipoServicio?: string | null;
  diasGestacion: number | null;
  partoEstimado: string | null;
  diasActuales: number | null;
  diasFaltantes?: number | null;
  partoEstimadoCalc: string | null;
  fechaSecado?: string | null;
  trimestre?: number | null;
  progreso: number | null;
  estado: string;
  observaciones?: string | null;
  inseminador?: string | null;
  condicionCorporal?: number | null;
  protocolo?: string | null;
  codigoPajuela?: string | null;
  createdAt: string;
}

export interface ReproduccionCreateInput {
  hembraId: string;
  padreId?: string;
  toroId?: string;
  fechaInseminacion: string;
  cicloNumero?: number;
  resultado?: string;
  tipoServicio?: string;
  estado?: string;
  observaciones?: string;
  inseminador?: string;
  condicionCorporal?: number;
  protocolo?: string;
  codigoPajuela?: string;
}

export function useReproduccion(
  page: number = 1,
  limit: number = 200,
  filters: Record<string, string> = {},
) {
  return useQuery({
    queryKey: ["reproduccion", { page, limit, ...filters }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const response = await apiRequest<ReproduccionEvent[]>(`/api/reproduccion?${params.toString()}`);
      if (!response.success) throw new Error(response.error?.message || "Error listando reproducción");
      return response;
    },
  });
}

export function useCreateReproduccion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: ReproduccionCreateInput) => {
      const response = await apiRequest<ReproduccionEvent>("/api/reproduccion", {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!response.success) {
        const details = response.error?.details?.map((d: any) => `${d.path}: ${d.message}`).join("; ");
        throw new Error(details || response.error?.message || "Error registrando inseminación");
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reproduccion"] });
    },
  });
}

export function useUpdateReproduccion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ReproduccionCreateInput> }) => {
      const response = await apiRequest<ReproduccionEvent>(`/api/reproduccion/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      if (!response.success) {
        const details = response.error?.details?.map((d: any) => `${d.path}: ${d.message}`).join("; ");
        throw new Error(details || response.error?.message || "Error actualizando inseminación");
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reproduccion"] });
    },
  });
}

export function useDeleteReproduccion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest(`/api/reproduccion/${id}`, { method: "DELETE" });
      if (!response.success) {
        throw new Error(response.error?.message || "Error eliminando inseminación");
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reproduccion"] });
    },
  });
}
