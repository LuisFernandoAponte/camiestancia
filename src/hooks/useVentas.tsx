import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api.js";

export interface VentaCreateInput {
  idempotencyKey: string;
  animalId: string;
  compradorNombre: string;
  compradorDocumento?: string;
  compradorTelefono?: string;
  compradorEmail?: string;
  compradorFinca?: string;
  precioVenta: number;
  metodoPago: "efectivo" | "transferencia" | "cheque" | "letra" | "qr";
  fechaVenta?: string;
  referenciaContrato?: string;
  notas?: string;
}

export interface VentaResponse {
  id: string;
  animalId: string;
  createdAt: string;
}

export function useCreateVenta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: VentaCreateInput) => {
      const response = await apiRequest<VentaResponse | { status: string }>("/api/ventas", {
        method: "POST",
        body: JSON.stringify(data),
      });

      if (!response.success) {
        const details = response.error?.details?.map((d: any) => `${d.path}: ${d.message}`).join("; ");
        throw new Error(details || response.error?.message || "Error registrando venta");
      }

      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ventas"] });
    },
  });
}

export interface VentaItem {
  id: string;
  animalId: string;
  compradorNombre: string;
  compradorDocumento?: string | null;
  compradorTelefono?: string | null;
  compradorEmail?: string | null;
  compradorFinca?: string | null;
  precioVenta: number;
  metodoPago: string;
  fechaVenta?: string | null;
  referenciaContrato?: string | null;
  notas?: string | null;
  createdAt: string;
}

export function useVentas(page: number = 1, limit: number = 100) {
  return useQuery({
    queryKey: ["ventas", { page, limit }],
    queryFn: async () => {
      const response = await apiRequest<VentaItem[]>(
        `/api/ventas?page=${page}&limit=${limit}`,
      );
      if (!response.success) {
        throw new Error(response.error?.message || "Error listando ventas");
      }
      return response.data || [];
    },
  });
}
