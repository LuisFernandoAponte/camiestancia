import { z } from "zod";

export const createVentaSchema = z.object({
  idempotencyKey: z.string().min(1, "idempotencyKey requerida").max(64),
  animalId: z.string().uuid("animalId debe ser UUID válido"),
  compradorNombre: z.string().min(1, "Nombre del comprador requerido").max(40),
  compradorDocumento: z.string().max(20).optional().default(""),
  compradorTelefono: z.string().max(20).optional().default(""),
  compradorEmail: z.string().max(100).email("Email inválido").optional().or(z.literal("")),
  compradorFinca: z.string().max(60).optional().default(""),
  precioVenta: z.coerce.number().positive("Precio debe ser mayor a 0"),
  metodoPago: z.enum(["efectivo", "transferencia", "cheque", "letra", "qr"], {
    errorMap: () => ({ message: "Método de pago inválido" }),
  }),
  fechaVenta: z.string().optional(),
  referenciaContrato: z.string().max(40).optional().default(""),
  notas: z.string().optional().default(""),
  creadoPor: z.string().uuid("creadoPor debe ser UUID válido").optional(),
});

export type CreateVentaInput = z.infer<typeof createVentaSchema>;
