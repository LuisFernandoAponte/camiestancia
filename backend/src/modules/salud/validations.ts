import { z } from "zod";

export const SaludCreateSchema = z.object({
  animal_id: z.string().uuid("ID de animal inválido"),
  tipo: z.enum(["vacuna", "desparasitacion", "chequeo", "tratamiento"]),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)"),
  proxima_fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)").optional(),
  veterinario: z.string().min(1, "Veterinario requerido").max(100, "Veterinario no puede exceder 100 caracteres"),
  estado: z.enum(["pendiente", "aplicado", "cancelado", "reprogramado"]).default("pendiente"),
  notas: z.string().max(1000, "Notas no puede exceder 1000 caracteres").optional(),
}).refine(
  (data) => {
    if (!data.proxima_fecha) return true;
    return new Date(data.proxima_fecha + "T00:00:00") > new Date(data.fecha + "T00:00:00");
  },
  { message: "Próxima fecha debe ser posterior a la fecha del evento", path: ["proxima_fecha"] },
);

export const SaludUpdateSchema = z.object({
  tipo: z.enum(["vacuna", "desparasitacion", "chequeo", "tratamiento"]).optional(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)").optional(),
  proxima_fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha inválido (YYYY-MM-DD)").optional(),
  veterinario: z.string().min(1, "Veterinario requerido").max(100, "Veterinario no puede exceder 100 caracteres").optional(),
  estado: z.enum(["pendiente", "aplicado", "cancelado", "reprogramado"]).optional(),
  notas: z.string().max(1000, "Notas no puede exceder 1000 caracteres").optional(),
});

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(1000).default(20),
});

export type SaludCreate = z.infer<typeof SaludCreateSchema>;
export type SaludUpdate = z.infer<typeof SaludUpdateSchema>;
