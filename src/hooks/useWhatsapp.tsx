import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api.js";

export interface WhatsappMensaje {
  id: string;
  tipo: string;
  prioridad: string;
  icono: string;
  animal: string;
  chip: string;
  mensaje: string;
  mensajeCorto: string;
  destinatario: string;
  telefono: string;
  fecha: string | null;
  contexto: string;
  accion: string;
}

export interface WhatsappStats {
  total: number;
  urgentes: number;
  altas: number;
  medias: number;
  bajas: number;
  porTipo: { tipo: string; count: number }[];
}

export interface WhatsappResponse {
  mensajes: WhatsappMensaje[];
  stats: WhatsappStats;
}

export function useWhatsappMensajes() {
  return useQuery({
    queryKey: ["whatsapp", "mensajes"],
    queryFn: async () => {
      const response = await apiRequest<WhatsappResponse>("/api/whatsapp/mensajes");
      if (!response.success) {
        throw new Error(response.error?.message || "Error cargando mensajes");
      }
      return response.data;
    },
    refetchInterval: 120_000,
  });
}
