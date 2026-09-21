import { z } from "zod";

export const createBovinoSchema = z.object({
  chip: z.string().min(3, "Chip debe tener al menos 3 caracteres").max(50, "Chip no puede exceder 50 caracteres"),
  nombre: z.string().min(1, "Nombre requerido").max(100, "Nombre no puede exceder 100 caracteres"),
  raza: z.string().min(1, "Raza requerida"),
  sexo: z.preprocess(
    (val) => (val === "M" ? "Macho" : val === "F" ? "Hembra" : val),
    z.enum(["Macho", "Hembra", "M", "F"], { errorMap: () => ({ message: "Sexo debe ser Macho o Hembra" }) }),
  ),
  nacimiento: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Fecha de nacimiento inválida (usá YYYY-MM-DD)" }),
  pesoInicial: z.coerce.number().positive("Peso inicial debe ser positivo"),
  pesoActual: z.coerce.number().positive("Peso actual debe ser positivo"),
  potrero: z.string().min(2, "Potrero debe tener al menos 2 caracteres"),
  estado: z.enum(["activo", "disponible", "preñez", "cuarentena", "vendido", "fallecido"]).default("activo"),
  numeroIdentificacion: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  tipo: z.string().nullable().optional(),
  madreId: z.string().uuid("madreId debe ser un UUID válido").nullable().optional(),
  padreId: z.string().uuid("padreId debe ser un UUID válido").nullable().optional(),
  descartado: z.boolean().optional(),
  motivoDescarte: z.string().nullable().optional(),
  precio: z.coerce.number().min(0, "Precio no puede ser negativo").optional(),
  foto: z.string().nullable().optional(),
  fotoUrl: z.string().nullable().optional(),
});

export const updateBovinoSchema = createBovinoSchema.partial();

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(1000).default(20),
});

export const bulkUpdateSchema = z.object({
  ids: z.array(z.string()).min(1, "Al menos un ID requerido"),
  data: updateBovinoSchema,
});

export type CreateBovinoInput = z.infer<typeof createBovinoSchema>;
export type UpdateBovinoInput = z.infer<typeof updateBovinoSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type BulkUpdateInput = z.infer<typeof bulkUpdateSchema>;
