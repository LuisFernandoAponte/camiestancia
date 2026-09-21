/**
 * Hooks para bovinos
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, ApiResponse } from "@/lib/api.js";

export interface Bovino {
  id: string;
  chip: string;
  nombre: string;
  raza: string;
  sexo: string;
  nacimiento: string;
  pesoInicial: number;
  pesoActual: number;
  potrero: string;
  estado: string;
  precio?: number;
  foto?: string | null;
  fotoUrl?: string | null;
  madreId?: string | null;
  madreNombre?: string | null;
  madreChip?: string | null;
  padreId?: string | null;
  padreNombre?: string | null;
  padreChip?: string | null;
  descartado?: boolean | null;
  motivoDescarte?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BovinoCreateInput {
  chip: string;
  nombre: string;
  raza: string;
  sexo: string;
  nacimiento: string;
  pesoInicial: number;
  pesoActual: number;
  potrero: string;
  estado?: string;
  precio?: number;
  foto?: string | null;
  fotoUrl?: string | null;
  madreId?: string | null;
  padreId?: string | null;
  descartado?: boolean | null;
  motivoDescarte?: string | null;
}

/**
 * Hook para listar bovinos con paginación y filtros
 */
export function useBovinos(
  page: number = 1,
  limit: number = 20,
  filters: Record<string, string> = {},
) {
  return useQuery({
    queryKey: ["bovinos", { page, limit, ...filters }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());

      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await apiRequest<Bovino[]>(`/api/bovinos?${params.toString()}`);

      if (!response.success) {
        throw new Error(response.error?.message || "Error listando bovinos");
      }

      return response;
    },
    enabled: true,
  });
}

/**
 * Hook para obtener detalle de un bovino
 */
export function useBovino(id: string) {
  return useQuery({
    queryKey: ["bovinos", id],
    queryFn: async () => {
      const response = await apiRequest<Bovino>(`/api/bovinos/${id}`);

      if (!response.success) {
        throw new Error(response.error?.message || "Error cargando bovino");
      }

      return response.data;
    },
    enabled: !!id,
  });
}

/**
 * Hook para crear un bovino
 */
export function useCreateBovino() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: BovinoCreateInput) => {
      const response = await apiRequest<Bovino>("/api/bovinos", {
        method: "POST",
        body: JSON.stringify(data),
      });

      if (!response.success) {
        const details = response.error?.details?.map((d: any) => `${d.path}: ${d.message}`).join("; ");
        throw new Error(details || response.error?.message || "Error creando bovino");
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bovinos"] });
    },
  });
}

/**
 * Hook para actualizar un bovino
 */
export function useUpdateBovino() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<BovinoCreateInput> }) => {
      const response = await apiRequest<Bovino>(`/api/bovinos/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });

      if (!response.success) {
        const details = response.error?.details?.map((d: any) => `${d.path}: ${d.message}`).join("; ");
        throw new Error(details || response.error?.message || "Error actualizando bovino");
      }

      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["bovinos"] });
    },
  });
}

/**
 * Hook para eliminar un bovino
 */
export function useDeleteBovino() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest(`/api/bovinos/${id}`, {
        method: "DELETE",
      });

      if (!response.success) {
        const details = response.error?.details?.map((d: any) => `${d.path}: ${d.message}`).join("; ");
        throw new Error(details || response.error?.message || "Error eliminando bovino");
      }

      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bovinos"] });
    },
  });
}

/**
 * Hook para actualización masiva de bovinos
 */
export function useBulkUpdateBovino() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ids, data }: { ids: string[]; data: Partial<BovinoCreateInput> }) => {
      const response = await apiRequest("/api/bovinos/bulk", {
        method: "POST",
        body: JSON.stringify({ ids, data }),
      });

      if (!response.success) {
        const details = response.error?.details?.map((d: any) => `${d.path}: ${d.message}`).join("; ");
        throw new Error(details || response.error?.message || "Error en actualización masiva");
      }

      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bovinos"] });
    },
  });
}

/**
 * Hook para buscar bovinos
 */
export function useBobinosSearch(q: string) {
  return useQuery({
    queryKey: ["bovinos", "search", q],
    queryFn: async () => {
      if (!q) return [];

      const response = await apiRequest<Bovino[]>(
        `/api/bovinos/search?q=${encodeURIComponent(q)}`,
      );

      if (!response.success) {
        throw new Error(response.error?.message || "Error en búsqueda");
      }

      return response.data || [];
    },
    enabled: !!q,
  });
}

/**
 * Hook para obtener la genealogía completa (3 generaciones + crías + consanguinidad)
 */
export function useGenealogia(id: string | null) {
  return useQuery({
    queryKey: ["bovinos", id, "genealogia"],
    queryFn: async () => {
      if (!id) return null;
      const response = await apiRequest<any>(`/api/bovinos/${id}/genealogia`);
      if (!response.success) {
        throw new Error(response.error?.message || "Error cargando genealogía");
      }
      return response.data;
    },
    enabled: !!id,
  });
}
