import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api.js";

export interface AnimalInfo {
  id: string;
  chip: string;
  nombre: string | null;
  numeroIdentificacion: string | null;
  raza: string | null;
  color: string | null;
  sexo: string | null;
  nacimiento: string | null;
  estado: string;
  tipo: string | null;
  descartado: boolean | null;
}

export interface ArbolFamiliar {
  animal: AnimalInfo;
  madre: AnimalInfo | null;
  padre: AnimalInfo | null;
  hijos: AnimalInfo[];
  totalHijos: number;
}

export function useArbolFamiliar(id: string) {
  return useQuery({
    queryKey: ["genealogia", "arbol", id],
    queryFn: async () => {
      const response = await apiRequest<ArbolFamiliar>(`/api/genealogia/arbol/${id}`);
      if (!response.success) throw new Error(response.error?.message || "Error obteniendo árbol genealógico");
      return response.data;
    },
    enabled: !!id,
  });
}

export function useHijosDe(id: string) {
  return useQuery({
    queryKey: ["genealogia", "hijos", id],
    queryFn: async () => {
      const response = await apiRequest<AnimalInfo[]>(`/api/genealogia/hijos-de/${id}`);
      if (!response.success) throw new Error(response.error?.message || "Error obteniendo hijos");
      return response.data;
    },
    enabled: !!id,
  });
}

export function useAlertasParentesco() {
  return useQuery({
    queryKey: ["genealogia", "alertas-parentesco"],
    queryFn: async () => {
      const response = await apiRequest(`/api/genealogia/alertas-parentesco`);
      if (!response.success) throw new Error(response.error?.message || "Error obteniendo alertas de parentesco");
      return response.data;
    },
  });
}
