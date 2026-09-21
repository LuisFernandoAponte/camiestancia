import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api.js";

import { API_BASE_URL as API_URL } from "@/lib/api.js";

export function useConfigPublic() {
  return useQuery({
    queryKey: ["config", "public"],
    queryFn: async () => {
      try {
        const res = await fetch(`${API_URL}/api/configuracion/public`);
        const data = await res.json();
        return data.data as Record<string, string> | undefined;
      } catch {
        return { farm_name: "La Estancia" } as Record<string, string>;
      }
    },
    staleTime: 1000 * 60 * 5,
  });
}

export interface ConfigItem {
  id: string;
  clave: string;
  valor: string;
  tipo: string;
  descripcion: string;
  opciones: string[] | null;
  editable: boolean;
  orden: number;
}

export type ConfigGrouped = Record<string, ConfigItem[]>;

export function useConfiguracion() {
  return useQuery({
    queryKey: ["configuracion"],
    queryFn: async () => {
      const response = await apiRequest<ConfigGrouped>("/api/configuracion");
      if (!response.success) throw new Error(response.error?.message || "Error cargando configuración");
      return response.data;
    },
  });
}

export function useUpdateConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ clave, valor }: { clave: string; valor: string }) => {
      const response = await apiRequest(`/api/configuracion/${clave}`, {
        method: "PUT",
        body: JSON.stringify({ valor }),
      });
      if (!response.success) throw new Error(response.error?.message || "Error actualizando configuración");
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["configuracion"] });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) => {
      const response = await apiRequest("/api/auth/password", {
        method: "PUT",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!response.success) throw new Error(response.error?.message || "Error al cambiar contraseña");
      return response.data;
    },
  });
}

export function useUpdateConfigBulk() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (items: { clave: string; valor: string }[]) => {
      const response = await apiRequest("/api/configuracion", {
        method: "PUT",
        body: JSON.stringify({ items }),
      });
      if (!response.success) throw new Error(response.error?.message || "Error actualizando configuración");
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["configuracion"] });
    },
  });
}
