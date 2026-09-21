import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api.js";

export interface IatfCiclo {
  id: string;
  hembraId: string;
  hembra: string | null;
  chipHembra: string | null;
  numHembra: string | null;
  toroId: string | null;
  toro: string | null;
  chipToro: string | null;
  padreId: string | null;
  fechaInseminacion: string | null;
  cicloNumero: number;
  resultado: string | null;
  tipoServicio: string;
  diasGestacion: number | null;
  partoEstimado: string | null;
  fechaDiagnostico: string | null;
  estado: string;
  observaciones: string | null;
  diasActuales: number | null;
  partoEstimadoCalc: string | null;
  progreso: number | null;
}

export interface TasasPorCiclo {
  porCiclo: {
    ciclo: number;
    total: number;
    positivos: number;
    negativos: number;
    pendientes: number;
    tasaPreñez: number;
  }[];
  general: {
    total: number;
    positivos: number;
    negativos: number;
    tasaPreñez: number;
  };
}

export interface TasaPorToro {
  toroId: string;
  toro: string;
  chipToro: string;
  total: number;
  positivos: number;
  negativos: number;
  tasaPreñez: number;
}

export function useIatfCiclos(page: number = 1, limit: number = 200, filters: Record<string, string> = {}) {
  return useQuery({
    queryKey: ["iatf", "ciclos", { page, limit, ...filters }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", page.toString());
      params.append("limit", limit.toString());
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const response = await apiRequest<IatfCiclo[]>(`/api/iatf/ciclos?${params.toString()}`);
      if (!response.success) throw new Error(response.error?.message || "Error listando ciclos IATF");
      return response;
    },
  });
}

export function useTasasIatf(ciclo?: string) {
  return useQuery({
    queryKey: ["iatf", "tasas", ciclo],
    queryFn: async () => {
      const params = ciclo ? `?ciclo=${ciclo}` : "";
      const response = await apiRequest<TasasPorCiclo>(`/api/iatf/tasas${params}`);
      if (!response.success) throw new Error(response.error?.message || "Error obteniendo tasas IATF");
      return response.data;
    },
  });
}

export function useTasasPorToro() {
  return useQuery({
    queryKey: ["iatf", "tasas-por-toro"],
    queryFn: async () => {
      const response = await apiRequest<TasaPorToro[]>("/api/iatf/tasas-por-toro");
      if (!response.success) throw new Error(response.error?.message || "Error obteniendo tasas por toro");
      return response.data;
    },
  });
}

export function useVacasParaCiclo(proximoCiclo: number) {
  return useQuery({
    queryKey: ["iatf", "vacas-para-ciclo", proximoCiclo],
    queryFn: async () => {
      const response = await apiRequest(`/api/iatf/vacas-para-ciclo?proximo_ciclo=${proximoCiclo}`);
      if (!response.success) throw new Error(response.error?.message || "Error obteniendo vacas para ciclo");
      return response.data;
    },
  });
}

export function useHistorialHembra(hembraId: string) {
  return useQuery({
    queryKey: ["iatf", "historial-hembra", hembraId],
    queryFn: async () => {
      const response = await apiRequest(`/api/iatf/historial-hembra/${hembraId}`);
      if (!response.success) throw new Error(response.error?.message || "Error obteniendo historial");
      return response.data;
    },
    enabled: !!hembraId,
  });
}
