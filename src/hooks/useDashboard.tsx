import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api.js";

export interface DashboardKPIs {
  bovinos: {
    total: number;
    activas: number;
    disponibles: number;
    vendidos: number;
    fallecidos: number;
    hembras: number;
    machos: number;
    preñadas: number;
    tasaPreñez: number;
    pctDisponibles: number;
  };
  salud: {
    pendientes: number;
    proximas7d: number;
  };
  reproduccion: {
    inseminacionesActivas: number;
    partosProximos: number;
  };
  finanzas: {
    ingresosMes: number;
    egresosMes: number;
    margenMes: number;
  };
}

export interface TareaProxima {
  id: string;
  animal: string | null;
  chip: string | null;
  tipo: string;
  proximaFecha: string;
  veterinario: string | null;
}

export interface PartoProximo {
  id: string;
  hembra: string | null;
  chip: string | null;
  diasGestacion: number | null;
  partoEstimado: string;
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

export function useDashboardKPIs() {
  return useQuery({
    queryKey: ["dashboard", "kpis"],
    queryFn: async () => {
      const response = await apiRequest<DashboardKPIs>("/api/dashboard/kpis");
      if (!response.success) {
        throw new Error(response.error?.message || "Error cargando KPIs");
      }
      return response.data;
    },
  });
}

export function useDashboardGraficos() {
  return useQuery({
    queryKey: ["dashboard", "graficos"],
    queryFn: async () => {
      const response = await apiRequest("/api/dashboard/graficos");
      if (!response.success) {
        throw new Error(response.error?.message || "Error cargando gráficos");
      }
      return response.data;
    },
  });
}

export function useTareasProximas() {
  return useQuery({
    queryKey: ["dashboard", "tareas-proximas"],
    queryFn: async () => {
      const response = await apiRequest<TareaProxima[]>("/api/dashboard/tareas-proximas");
      if (!response.success) {
        throw new Error(response.error?.message || "Error cargando tareas");
      }
      return response.data;
    },
  });
}

export function usePartosProximos() {
  return useQuery({
    queryKey: ["dashboard", "partos-proximos"],
    queryFn: async () => {
      const response = await apiRequest<PartoProximo[]>("/api/dashboard/partos-proximos");
      if (!response.success) {
        throw new Error(response.error?.message || "Error cargando partos");
      }
      return response.data;
    },
  });
}

export function useGastosResumen(mes?: number, anio?: number) {
  return useQuery({
    queryKey: ["gastos", "resumen", mes, anio],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (mes) params.set("mes", mes.toString());
      if (anio) params.set("anio", anio.toString());
      const response = await apiRequest<GastoResumen>(`/api/gastos/resumen?${params.toString()}`);
      if (!response.success) {
        throw new Error(response.error?.message || "Error cargando resumen de gastos");
      }
      return response.data;
    },
  });
}
