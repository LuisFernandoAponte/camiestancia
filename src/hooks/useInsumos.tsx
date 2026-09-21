import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api.js";

export interface Insumo {
  id: string;
  nombre: string;
  tipo: string;
  presentacion: string | null;
  stockActual: number;
  stockMinimo: number;
  unidad: string;
  lote: string | null;
  fechaCompra: string | null;
  fechaVencimiento: string | null;
  proveedor: string | null;
  costoUnitario: number;
  notas: string | null;
  imagenUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InsumoCreateInput {
  nombre: string;
  tipo: string;
  presentacion?: string;
  stockActual?: number;
  stockMinimo?: number;
  unidad?: string;
  lote?: string;
  fechaCompra?: string;
  fechaVencimiento?: string;
  proveedor?: string;
  costoUnitario?: number;
  notas?: string;
  imagenUrl?: string | null;
}

export interface AlertasInsumos {
  criticos: InsumoAlerta[];
  vencidos: InsumoAlerta[];
  porVencer: InsumoAlerta[];
}

export interface InsumoAlerta {
  id: string;
  nombre: string;
  tipo: string;
  stockActual: number;
  stockMinimo: number;
  unidad: string;
  fechaVencimiento: string | null;
  lote: string | null;
  imagenUrl?: string | null;
}

export const tiposInsumo = [
  { value: "vacuna", label: "Vacuna", color: "#3b82f6", icon: "💉" },
  { value: "desparasitante", label: "Desparasitante", color: "#22c55e", icon: "🪱" },
  { value: "antibiotico", label: "Antibiótico", color: "#ef4444", icon: "💊" },
  { value: "antiinflamatorio", label: "Antiinflamatorio", color: "#f97316", icon: "🩹" },
  { value: "vitamina", label: "Vitamina", color: "#eab308", icon: "🧪" },
  { value: "suplemento", label: "Suplemento", color: "#a855f7", icon: "⚡" },
  { value: "herramienta", label: "Herramienta", color: "#6b7280", icon: "🔧" },
  { value: "otro", label: "Otro", color: "#94a3b8", icon: "📦" },
];

export function useInsumos(
  page: number = 1,
  limit: number = 200,
  filters: Record<string, string> = {},
) {
  return useQuery({
    queryKey: ["insumos", { page, limit, ...filters }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const response = await apiRequest<Insumo[]>(`/api/insumos?${params.toString()}`);
      if (!response.success) throw new Error(response.error?.message || "Error listando insumos");
      return response;
    },
  });
}

export function useAlertasInsumos() {
  return useQuery({
    queryKey: ["insumos", "alertas"],
    queryFn: async () => {
      const response = await apiRequest<AlertasInsumos>("/api/insumos/alertas");
      if (!response.success) throw new Error(response.error?.message || "Error cargando alertas");
      return response.data;
    },
    refetchInterval: 60000,
  });
}

export function useCreateInsumo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsumoCreateInput) => {
      const response = await apiRequest<Insumo>("/api/insumos", {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!response.success) {
        const details = response.error?.details?.map((d: any) => `${d.path}: ${d.message}`).join("; ");
        throw new Error(details || response.error?.message || "Error creando insumo");
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insumos"] });
    },
  });
}

export function useUpdateInsumo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsumoCreateInput> }) => {
      const response = await apiRequest<Insumo>(`/api/insumos/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      if (!response.success) {
        const details = response.error?.details?.map((d: any) => `${d.path}: ${d.message}`).join("; ");
        throw new Error(details || response.error?.message || "Error actualizando insumo");
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insumos"] });
    },
  });
}

export function useDeleteInsumo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest(`/api/insumos/${id}`, { method: "DELETE" });
      if (!response.success) throw new Error(response.error?.message || "Error eliminando insumo");
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["insumos"] });
    },
  });
}
