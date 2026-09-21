import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api.js";

export interface AlertaConsultor {
  categoria: string;
  prioridad: string;
  mensaje_alerta: string;
  recomendacion: string | null;
}

export interface ConsultorStats {
  totalBovinos: number;
  totalHembras: number;
  totalMachos: number;
  disponibles: number;
  vendidos: number;
  fallecidos: number;
  preñezEstado: number;
  hembrasGestantes: number;
  proximosPartos30d: number;
  vacunasProximas7d: number;
  chequeosPendientes: number;
  desparasitacionesPendientes: number;
  inseminacionesEsteMes: number;
  abortosEsteMes: number;
  conPerdidaPeso: number;
  bajoPesoEdad: number;
  hembrasDisponiblesServicio: number;
  partoInminente: number;
  tasaPreñez: number;
  pctDisponibles: number;
  pesoPromHembras: number;
  pesoPromMachos: number;
  gestantesConSaludPendiente: number;
  insemMesAnterior: number;
  tendenciaInsem: "subiendo" | "bajando" | "estable";
  saludAplicadasMes: number;
  saludAplicadasMesAnterior: number;
  tendenciaSalud: "subiendo" | "bajando" | "estable";
  ingresosMes: number;
  egresosMes: number;
  margenMes: number;
  margenMesAnterior: number;
}

export interface Insight {
  tipo: "positivo" | "alerta" | "info" | "recomendacion";
  icono: string;
  titulo: string;
  mensaje: string;
}

export interface Recomendacion {
  prioridad: "alta" | "media" | "baja";
  area: string;
  accion: string;
  detalle: string;
}

export interface FAQ {
  pregunta: string;
  respuesta: string;
}

export interface ConsultorResumen {
  stats: ConsultorStats;
  probabilidades: Insight[];
  insights: Insight[];
  recomendaciones: Recomendacion[];
  calendarioMes: { mes: number; actividad: string; prioridad: string }[];
  faq: FAQ[];
}

export function useAlertasConsultor() {
  return useQuery({
    queryKey: ["consultor", "alertas"],
    queryFn: async () => {
      const response = await apiRequest<AlertaConsultor[]>("/api/consultor/alertas");
      if (!response.success) {
        throw new Error(response.error?.message || "Error cargando alertas");
      }
      return response.data || [];
    },
    refetchInterval: 60_000,
  });
}

export function useConsultorResumen() {
  return useQuery({
    queryKey: ["consultor", "resumen"],
    queryFn: async () => {
      const response = await apiRequest<ConsultorResumen>("/api/consultor/resumen");
      if (!response.success) {
        throw new Error(response.error?.message || "Error cargando resumen");
      }
      return response.data;
    },
    refetchInterval: 60_000,
  });
}
