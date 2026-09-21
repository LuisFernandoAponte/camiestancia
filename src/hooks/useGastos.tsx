import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api.js";

export interface Gasto {
  id: string;
  lote: string;
  mes: number;
  anio: number;
  categoria: string;
  descripcion: string | null;
  monto: number;
  createdAt: string;
}

export interface GastoResumenItem {
  categoria: string;
  monto: number;
}

export interface GastoResumen {
  mes: number;
  anio: number;
  total: number;
  detalle: GastoResumenItem[];
}

export interface GastoCreateInput {
  lote: string;
  mes: number;
  anio: number;
  categoria: string;
  descripcion?: string;
  monto: number;
}

export const categorias = [
  { value: "remedios", label: "💊 Sanidad, Remedios y Vacunas", color: "#22c55e" },
  { value: "alimentacion", label: "🌾 Alimentación, Sales y Heno", color: "#eab308" },
  { value: "genetica", label: "🧬 Genética, Semen e IATF", color: "#ec4899" },
  { value: "trabajador", label: "👷 Personal, Vaqueros y Servicios", color: "#3b82f6" },
  { value: "potreros", label: "🚜 Potreros, Cercas y Pastos", color: "#84cc16" },
  { value: "mantenimiento", label: "🔧 Mantenimiento e Infraestructura", color: "#f97316" },
  { value: "transporte", label: "🚛 Fletes y Guías de Transporte", color: "#a855f7" },
  { value: "equipos", label: "📦 Equipamiento y Herramientas", color: "#14b8a6" },
  { value: "impuestos", label: "🏛️ Impuestos, Tasas y Varios", color: "#64748b" },
  { value: "otros", label: "📋 Otros Gastos Operativos", color: "#6b7280" },
];



export function useGastos(
  page: number = 1,
  limit: number = 200,
  filters: Record<string, string> = {},
) {
  return useQuery({
    queryKey: ["gastos", { page, limit, ...filters }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const response = await apiRequest<Gasto[]>(`/api/gastos?${params.toString()}`);
      if (!response.success) throw new Error(response.error?.message || "Error listando gastos");
      return response;
    },
  });
}

export function useGastosResumen(mes?: number, anio?: number) {
  return useQuery({
    queryKey: ["gastos", "resumen", mes, anio],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (mes) params.append("mes", mes.toString());
      if (anio) params.append("anio", anio?.toString() || "");
      const response = await apiRequest<GastoResumen>(`/api/gastos/resumen?${params.toString()}`);
      if (!response.success) throw new Error(response.error?.message || "Error cargando resumen");
      return response.data;
    },
  });
}

export function useCreateGasto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: GastoCreateInput) => {
      const response = await apiRequest<Gasto>("/api/gastos", {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!response.success) {
        const details = response.error?.details?.map((d: any) => `${d.path}: ${d.message}`).join("; ");
        throw new Error(details || response.error?.message || "Error creando gasto");
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gastos"] });
    },
  });
}

export function useUpdateGasto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<GastoCreateInput> }) => {
      const response = await apiRequest<Gasto>(`/api/gastos/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      if (!response.success) {
        const details = response.error?.details?.map((d: any) => `${d.path}: ${d.message}`).join("; ");
        throw new Error(details || response.error?.message || "Error actualizando gasto");
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gastos"] });
    },
  });
}

export function useDeleteGasto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest(`/api/gastos/${id}`, { method: "DELETE" });
      if (!response.success) throw new Error(response.error?.message || "Error eliminando gasto");
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gastos"] });
    },
  });
}
