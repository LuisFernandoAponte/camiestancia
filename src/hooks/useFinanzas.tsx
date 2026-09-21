import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api.js";

export interface FinanzasKpi {
  ingresosMes: number;
  egresosMes: number;
  margenNeto: number;
  proyeccionAnual: number;
  mesActual: number;
  anioActual: number;
}

export interface FinanzasLote {
  lote: string;
  ingresos: number;
  egresos: number;
  margen: number;
  registros: number;
}

export interface FinanzasSerie {
  mes: string;
  ingresos: number;
  egresos: number;
}

export interface FinanzasRegistro {
  id: string;
  lote: string;
  mes: number;
  anio: number;
  ingresos: number;
  egresos: number;
  createdAt: string;
}

export interface FinanzasCreateInput {
  lote: string;
  mes: number;
  anio: number;
  ingresos?: number;
  egresos?: number;
}

export function useFinanzasKpis() {
  return useQuery({
    queryKey: ["finanzas", "kpis"],
    queryFn: async () => {
      const response = await apiRequest<FinanzasKpi>("/api/finanzas");
      if (!response.success) throw new Error(response.error?.message || "Error cargando KPIs");
      return response.data;
    },
  });
}

export function useFinanzasLotes() {
  return useQuery({
    queryKey: ["finanzas", "lotes"],
    queryFn: async () => {
      const response = await apiRequest<FinanzasLote[]>("/api/finanzas/lotes");
      if (!response.success) throw new Error(response.error?.message || "Error cargando lotes");
      return response.data;
    },
  });
}

export function useFinanzasHistorico(meses: number = 6) {
  return useQuery({
    queryKey: ["finanzas", "historico", meses],
    queryFn: async () => {
      const response = await apiRequest<FinanzasSerie[]>(`/api/finanzas/historico?meses=${meses}`);
      if (!response.success) throw new Error(response.error?.message || "Error cargando histórico");
      return response.data;
    },
  });
}

export function useFinanzasRegistros(page: number = 1, limit: number = 200) {
  return useQuery({
    queryKey: ["finanzas", "registros", { page, limit }],
    queryFn: async () => {
      const response = await apiRequest<FinanzasRegistro[]>(`/api/finanzas/registros?page=${page}&limit=${limit}`);
      if (!response.success) throw new Error(response.error?.message || "Error listando registros");
      return response;
    },
  });
}

export function useCreateFinanzas() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: FinanzasCreateInput) => {
      const response = await apiRequest<FinanzasRegistro>("/api/finanzas", {
        method: "POST",
        body: JSON.stringify(data),
      });
      if (!response.success) {
        const details = response.error?.details?.map((d: any) => `${d.path}: ${d.message}`).join("; ");
        throw new Error(details || response.error?.message || "Error creando registro");
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finanzas"] });
    },
  });
}

export function useUpdateFinanzas() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FinanzasCreateInput> }) => {
      const response = await apiRequest<FinanzasRegistro>(`/api/finanzas/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
      if (!response.success) {
        const details = response.error?.details?.map((d: any) => `${d.path}: ${d.message}`).join("; ");
        throw new Error(details || response.error?.message || "Error actualizando registro");
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finanzas"] });
    },
  });
}

export interface FinanzasResumen {
  resumen: { ingresos: number; egresos: number; margen: number; total_registros: number };
  porCategoria: { categoria: string; total: number }[];
  ultimosRegistros: { categoria: string; descripcion: string | null; monto: number; lote: string; createdAt: string; tipo: "ingreso" | "gasto" }[];
  insights: { categoria: string; trend: string }[];
  moneda: string;
  mes: number;
  anio: number;
}

export function useFinanzasResumen(mes?: number, anio?: number) {
  return useQuery({
    queryKey: ["finanzas", "resumen", mes, anio],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (mes) params.set("mes", mes.toString());
      if (anio) params.set("anio", anio.toString());
      const response = await apiRequest<FinanzasResumen>(`/api/finanzas/resumen?${params.toString()}`);
      if (!response.success) throw new Error(response.error?.message || "Error cargando resumen");
      return (
        response.data || {
          resumen: { ingresos: 0, egresos: 0, margen: 0, total_registros: 0 },
          porCategoria: [],
          ultimosRegistros: [],
          insights: [],
          moneda: "Bs.",
          mes: mes || 8,
          anio: anio || 2026,
        }
      );
    },
    refetchInterval: 120_000,
  });
}

export function useDeleteFinanzas() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest(`/api/finanzas/${id}`, { method: "DELETE" });
      if (!response.success) throw new Error(response.error?.message || "Error eliminando registro");
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finanzas"] });
    },
  });
}
