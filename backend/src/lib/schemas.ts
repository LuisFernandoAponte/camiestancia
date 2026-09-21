import { z } from "zod";

// ========== AUTH ==========
export const LoginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Contraseña debe tener al menos 6 caracteres"),
});

export type LoginInput = z.infer<typeof LoginSchema>;

// ========== REPRODUCCIÓN (IATF) ==========
export const ReproduccionCreateSchema = z.object({
  hembraId: z.string().uuid("ID de hembra inválido"),
  toroId: z.string().uuid("ID de toro inválido").optional().nullable(),
  padreId: z.string().uuid("ID de padre inválido").optional().nullable(),
  fechaInseminacion: z.preprocess((v) => (v instanceof Date ? v.toISOString().split("T")[0] : String(v)), z.string()),
  cicloNumero: z.coerce.number().int().min(1).max(10).default(1),
  resultado: z.enum(["positivo", "negativo", "pendiente"]).default("pendiente"),
  tipoServicio: z.enum(["iatf", "servicio_natural", "transferencia_embrion"]).default("iatf"),
  estado: z.enum(["confirmada", "evaluacion", "aborto", "parto_realizado", "descartada"]).default("evaluacion"),
  observaciones: z.string().optional(),
  inseminador: z.string().optional().nullable(),
  condicionCorporal: z.coerce.number().min(1).max(5).optional().nullable(),
  protocolo: z.string().optional().nullable(),
  codigoPajuela: z.string().optional().nullable(),
});

export const ReproduccionUpdateSchema = ReproduccionCreateSchema.partial();

export type ReproduccionCreate = z.infer<typeof ReproduccionCreateSchema>;
export type ReproduccionUpdate = z.infer<typeof ReproduccionUpdateSchema>;

// ========== DIAGNÓSTICOS ==========
export const DiagnosticoCreateSchema = z.object({
  animalId: z.string().uuid("ID de animal inválido"),
  reproduccionId: z.string().uuid("ID de reproducción inválido").optional().nullable(),
  fechaDiagnostico: z.preprocess((v) => (v instanceof Date ? v.toISOString().split("T")[0] : String(v)), z.string()),
  tipoDiagnostico: z.enum(["tacto", "ecografia"]),
  resultado: z.enum(["preñada", "vacia", "aborto", "no_confirmado"]),
  edadGestacionalDias: z.coerce.number().int().min(0).optional().nullable(),
  observaciones: z.string().optional(),
});

export const DiagnosticoUpdateSchema = DiagnosticoCreateSchema.partial();

export type DiagnosticoCreate = z.infer<typeof DiagnosticoCreateSchema>;
export type DiagnosticoUpdate = z.infer<typeof DiagnosticoUpdateSchema>;

// ========== TOROS ==========
export const ToroCreateSchema = z.object({
  bovinoId: z.string().uuid("ID de bovino inválido"),
  codigo: z.string().optional(),
  nombre: z.string().min(1, "Nombre requerido"),
  raza: z.string().optional(),
  fechaNacimiento: z.coerce.date().optional(),
  fechaEvaluacion: z.preprocess((v) => (v instanceof Date ? v.toISOString().split("T")[0] : v ? String(v) : undefined), z.string().optional()),
  pesoEvaluacion: z.coerce.number().positive().optional(),
  circunferenciaEscrotal: z.coerce.number().positive().optional(),
  calidadSeminal: z.enum(["A", "S", "E", "B"]).optional(),
  categoria: z.string().optional(),
  activo: z.boolean().default(true),
  descartado: z.boolean().default(false),
  motivoDescarte: z.string().optional(),
  observaciones: z.string().optional(),
});

export const ToroUpdateSchema = ToroCreateSchema.partial();

export type ToroCreate = z.infer<typeof ToroCreateSchema>;
export type ToroUpdate = z.infer<typeof ToroUpdateSchema>;

// ========== EVENTOS REPRODUCTIVOS ==========
export const EventoReproductivoCreateSchema = z.object({
  animalId: z.string().uuid("ID de animal inválido"),
  fechaEvento: z.coerce.date(),
  tipoEvento: z.enum(["servicio_natural", "iatf", "parto", "destete", "aborto", "diagnostico"]),
  toroId: z.string().uuid("ID de toro inválido").optional().nullable(),
  descripcion: z.string().optional(),
  resultado: z.string().optional(),
  observaciones: z.string().optional(),
});

export const EventoReproductivoUpdateSchema = EventoReproductivoCreateSchema.partial();

export type EventoReproductivoCreate = z.infer<typeof EventoReproductivoCreateSchema>;
export type EventoReproductivoUpdate = z.infer<typeof EventoReproductivoUpdateSchema>;

// ========== VAQUILLAS ==========
export const VaquillaCreateSchema = z.object({
  bovinoId: z.string().uuid("ID de bovino inválido"),
  tat: z.string().optional(),
  fechaNacimiento: z.coerce.date().optional(),
  padreId: z.string().uuid("ID de padre inválido").optional().nullable(),
  madreId: z.string().uuid("ID de madre inválido").optional().nullable(),
  color: z.enum(["BC", "CL", "CO", "OV", "NE", "BR", "OT"]).optional(),
  numeroLote: z.coerce.number().int().optional(),
  observaciones: z.string().optional(),
  estado: z.string().optional(),
});

export const VaquillaUpdateSchema = VaquillaCreateSchema.partial();

export type VaquillaCreate = z.infer<typeof VaquillaCreateSchema>;
export type VaquillaUpdate = z.infer<typeof VaquillaUpdateSchema>;

// ========== FINANZAS ==========
export const FinanzasCreateSchema = z.object({
  lote: z.string().min(1, "Lote requerido"),
  mes: z.coerce.number().int().min(1).max(12),
  anio: z.coerce.number().int().min(2020),
  ingresos: z.coerce.number().default(0),
  egresos: z.coerce.number().default(0),
});

export const FinanzasUpdateSchema = FinanzasCreateSchema.partial();

export type FinanzasCreate = z.infer<typeof FinanzasCreateSchema>;
export type FinanzasUpdate = z.infer<typeof FinanzasUpdateSchema>;

// ========== QUERY PARAMS ==========
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(20),
});

export type Pagination = z.infer<typeof PaginationSchema>;
