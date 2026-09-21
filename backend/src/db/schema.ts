import {
  pgTable,
  text,
  uuid,
  timestamp,
  numeric,
  integer,
  date,
  pgEnum,
  uniqueIndex,
  foreignKey,
  index,
  boolean,
} from "drizzle-orm/pg-core";

export const estadoBovinoEnum = pgEnum("estado_bovino", [
  "activo",
  "disponible",
  "vendido",
  "cuarentena",
 "preñez",
  "fallecido",
]);

export const estadoSaludEnum = pgEnum("estado_salud", [
  "pendiente",
  "aplicado",
  "cancelado",
  "reprogramado",
]);

export const tipoSaludEnum = pgEnum("tipo_salud", [
  "vacuna",
  "desparasitacion",
  "chequeo",
  "tratamiento",
]);

export const estadoReproduccionEnum = pgEnum("estado_reproduccion", [
  "confirmada",
  "evaluacion",
  "aborto",
  "parto_realizado",
  "descartada",
]);

export const tipoBovinoEnum = pgEnum("tipo_bovino", [
  "vaca",
  "vaquilla",
  "toro",
  "novillo",
  "ternero",
  "ternera",
]);

export const resultadoIatfEnum = pgEnum("resultado_iatf", [
  "positivo",
  "negativo",
  "pendiente",
]);

export const tipoServicioEnum = pgEnum("tipo_servicio", [
  "iatf",
  "servicio_natural",
  "transferencia_embrion",
]);

export const tipoDiagnosticoEnum = pgEnum("tipo_diagnostico", [
  "tacto",
  "ecografia",
]);

export const resultadoDiagnosticoEnum = pgEnum("resultado_diagnostico", [
  "preñada",
  "vacia",
  "aborto",
  "no_confirmado",
]);

export const tipoEventoReproductivoEnum = pgEnum("tipo_evento_reproductivo", [
  "servicio_natural",
  "iatf",
  "parto",
  "destete",
  "aborto",
  "diagnostico",
]);

export const calidadSeminalEnum = pgEnum("calidad_seminal", [
  "A",
  "S",
  "E",
  "B",
]);

export const colorBovinoEnum = pgEnum("color_bovino", [
  "BC",
  "CL",
  "CO",
  "OV",
  "NE",
  "BR",
  "OT",
]);

export const usuarios = pgTable(
  "usuarios",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    rol: text("rol").notNull().default("gestor"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: uniqueIndex("idx_usuarios_email").on(table.email),
  }),
);

export const bovinos = pgTable(
  "bovinos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    chip: text("chip").notNull().unique(),
    numeroIdentificacion: text("numero_identificacion"),
    nombre: text("nombre"),
    raza: text("raza"),
    sexo: text("sexo"),
    color: colorBovinoEnum("color"),
    tipo: tipoBovinoEnum("tipo"),
    nacimiento: timestamp("nacimiento"),
    pesoInicial: numeric("peso_inicial", { precision: 6, scale: 2 }),
    pesoActual: numeric("peso_actual", { precision: 6, scale: 2 }),
    potrero: text("potrero"),
    madreId: uuid("madre_id"),
    padreId: uuid("padre_id"),
    estado: estadoBovinoEnum("estado").default("activo"),
    descartado: boolean("descartado").default(false),
    motivoDescarte: text("motivo_descarte"),
    precio: numeric("precio", { precision: 10, scale: 2 }).default("0"),
    foto: text("foto"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    chipIdx: uniqueIndex("idx_bovinos_chip").on(table.chip),
    estadoIdx: index("idx_bovinos_estado").on(table.estado),
    madreIdx: index("idx_bovinos_madre").on(table.madreId),
    padreIdx: index("idx_bovinos_padre").on(table.padreId),
    tipoIdx: index("idx_bovinos_tipo").on(table.tipo),
    fk_madre: foreignKey({
      columns: [table.madreId],
      foreignColumns: [table.id],
    }).onDelete("set null"),
    fk_padre: foreignKey({
      columns: [table.padreId],
      foreignColumns: [table.id],
    }).onDelete("set null"),
  }),
);

export const salud = pgTable(
  "salud",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    animalId: uuid("animal_id").notNull(),
    tipo: tipoSaludEnum("tipo").notNull(),
    fecha: timestamp("fecha").notNull(),
    proximaFecha: timestamp("proxima_fecha"),
    veterinario: text("veterinario"),
    estado: estadoSaludEnum("estado").default("pendiente"),
    notas: text("notas"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    animalIdIdx: index("idx_salud_animal_id").on(table.animalId),
    fk_animal: foreignKey({
      columns: [table.animalId],
      foreignColumns: [bovinos.id],
    }).onDelete("cascade"),
  }),
);

export const reproduccion = pgTable(
  "reproduccion",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    hembraId: uuid("hembra_id").notNull(),
    toroId: uuid("toro_id"),
    padreId: uuid("padre_id"),
    fechaInseminacion: timestamp("fecha_inseminacion", { mode: "string" }).notNull(),
    cicloNumero: integer("ciclo_numero").default(1),
    resultado: resultadoIatfEnum("resultado").default("pendiente"),
    tipoServicio: tipoServicioEnum("tipo_servicio").default("iatf"),
    diasGestacion: integer("dias_gestacion"),
    partoEstimado: timestamp("parto_estimado", { mode: "string" }),
    fechaDiagnostico: timestamp("fecha_diagnostico", { mode: "string" }),
    estado: estadoReproduccionEnum("estado").default("confirmada"),
    observaciones: text("observaciones"),
    inseminador: text("inseminador"),
    condicionCorporal: numeric("condicion_corporal", { precision: 3, scale: 1 }),
    protocolo: text("protocolo"),
    codigoPajuela: text("codigo_pajuela"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    fk_hembra: foreignKey({
      columns: [table.hembraId],
      foreignColumns: [bovinos.id],
    }).onDelete("cascade"),
    fk_toro: foreignKey({
      columns: [table.toroId],
      foreignColumns: [bovinos.id],
    }).onDelete("set null"),
    fk_padre: foreignKey({
      columns: [table.padreId],
      foreignColumns: [bovinos.id],
    }).onDelete("set null"),
    hembraIdx: index("idx_reproduccion_hembra").on(table.hembraId),
    cicloIdx: index("idx_reproduccion_ciclo").on(table.cicloNumero),
    resultadoIdx: index("idx_reproduccion_resultado").on(table.resultado),
  }),
);

export const diagnosticos = pgTable(
  "diagnosticos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    animalId: uuid("animal_id").notNull(),
    reproduccionId: uuid("reproduccion_id"),
    fechaDiagnostico: timestamp("fecha_diagnostico", { mode: "string" }).notNull(),
    tipoDiagnostico: tipoDiagnosticoEnum("tipo_diagnostico").notNull(),
    resultado: resultadoDiagnosticoEnum("resultado").notNull(),
    edadGestacionalDias: integer("edad_gestacional_dias"),
    observaciones: text("observaciones"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    fk_animal: foreignKey({
      columns: [table.animalId],
      foreignColumns: [bovinos.id],
    }).onDelete("cascade"),
    fk_reproduccion: foreignKey({
      columns: [table.reproduccionId],
      foreignColumns: [reproduccion.id],
    }).onDelete("set null"),
    animalIdx: index("idx_diagnosticos_animal").on(table.animalId),
  }),
);

export const eventosReproductivos = pgTable(
  "eventos_reproductivos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    animalId: uuid("animal_id").notNull(),
    fechaEvento: timestamp("fecha_evento", { mode: "string" }).notNull(),
    tipoEvento: tipoEventoReproductivoEnum("tipo_evento").notNull(),
    toroId: uuid("toro_id"),
    descripcion: text("descripcion"),
    resultado: text("resultado"),
    observaciones: text("observaciones"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    fk_animal: foreignKey({
      columns: [table.animalId],
      foreignColumns: [bovinos.id],
    }).onDelete("cascade"),
    fk_toro: foreignKey({
      columns: [table.toroId],
      foreignColumns: [bovinos.id],
    }).onDelete("set null"),
    animalIdx: index("idx_eventos_animal").on(table.animalId),
  }),
);

export const toros = pgTable(
  "toros",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bovinoId: uuid("bovino_id").notNull().unique(),
    codigo: text("codigo"),
    nombre: text("nombre"),
    raza: text("raza"),
    fechaNacimiento: timestamp("fecha_nacimiento"),
    fechaEvaluacion: timestamp("fecha_evaluacion", { mode: "string" }),
    pesoEvaluacion: numeric("peso_evaluacion", { precision: 6, scale: 2 }),
    circunferenciaEscrotal: numeric("circunferencia_escrotal", { precision: 5, scale: 1 }),
    calidadSeminal: calidadSeminalEnum("calidad_seminal"),
    categoria: text("categoria"),
    activo: boolean("activo").default(true),
    descartado: boolean("descartado").default(false),
    motivoDescarte: text("motivo_descarte"),
    observaciones: text("observaciones"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    fk_bovino: foreignKey({
      columns: [table.bovinoId],
      foreignColumns: [bovinos.id],
    }).onDelete("cascade"),
    activoIdx: index("idx_toros_activo").on(table.activo),
  }),
);

export const vaquillas = pgTable(
  "vaquillas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bovinoId: uuid("bovino_id").notNull().unique(),
    tat: text("tat"),
    fechaNacimiento: timestamp("fecha_nacimiento"),
    padreId: uuid("padre_id"),
    madreId: uuid("madre_id"),
    color: colorBovinoEnum("color"),
    numeroLote: integer("numero_lote"),
    observaciones: text("observaciones"),
    estado: text("estado"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    fk_bovino: foreignKey({
      columns: [table.bovinoId],
      foreignColumns: [bovinos.id],
    }).onDelete("cascade"),
    fk_padre: foreignKey({
      columns: [table.padreId],
      foreignColumns: [bovinos.id],
    }).onDelete("set null"),
    fk_madre: foreignKey({
      columns: [table.madreId],
      foreignColumns: [bovinos.id],
    }).onDelete("set null"),
  }),
);

export const finanzas = pgTable(
  "finanzas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lote: text("lote").notNull(),
    mes: integer("mes"),
    anio: integer("anio"),
    ingresos: numeric("ingresos", { precision: 12, scale: 2 }).default("0"),
    egresos: numeric("egresos", { precision: 12, scale: 2 }).default("0"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueLoteMesAnio: uniqueIndex("idx_finanzas_unique_lote_mes_anio").on(
      table.lote,
      table.mes,
      table.anio,
    ),
  }),
);

export type Usuario = typeof usuarios.$inferSelect;
export type UsuarioInsert = typeof usuarios.$inferInsert;

export type Bovino = typeof bovinos.$inferSelect;
export type BovinoInsert = typeof bovinos.$inferInsert;

export type SaludEvento = typeof salud.$inferSelect;
export type SaludEventoInsert = typeof salud.$inferInsert;

export type Reproduccion = typeof reproduccion.$inferSelect;
export type ReproduccionInsert = typeof reproduccion.$inferInsert;

export type Diagnostico = typeof diagnosticos.$inferSelect;
export type DiagnosticoInsert = typeof diagnosticos.$inferInsert;

export type EventoReproductivo = typeof eventosReproductivos.$inferSelect;
export type EventoReproductivoInsert = typeof eventosReproductivos.$inferInsert;

export type Toro = typeof toros.$inferSelect;
export type ToroInsert = typeof toros.$inferInsert;

export type Vaquilla = typeof vaquillas.$inferSelect;
export type VaquillaInsert = typeof vaquillas.$inferInsert;

export const gastos = pgTable(
  "gastos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lote: text("lote").notNull(),
    mes: integer("mes").notNull(),
    anio: integer("anio").notNull(),
    categoria: text("categoria").notNull(),
    descripcion: text("descripcion"),
    monto: numeric("monto", { precision: 12, scale: 2 }).notNull().default("0"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
);

export type Gastos = typeof gastos.$inferSelect;
export type GastosInsert = typeof gastos.$inferInsert;

export const metodoPagoEnum = pgEnum("metodo_pago", [
  "efectivo",
  "transferencia",
  "cheque",
  "letra",
  "qr",
]);

export const ventas = pgTable(
  "ventas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    idempotencyKey: text("idempotency_key").unique(),
    animalId: uuid("animal_id").notNull(),
    compradorNombre: text("comprador_nombre").notNull(),
    compradorDocumento: text("comprador_documento"),
    compradorTelefono: text("comprador_telefono"),
    compradorEmail: text("comprador_email"),
    compradorFinca: text("comprador_finca"),
    fechaVenta: date("fecha_venta").notNull().defaultNow(),
    precioVenta: numeric("precio_venta", { precision: 10, scale: 2 }).notNull(),
    metodoPago: metodoPagoEnum("metodo_pago").notNull(),
    estadoPago: text("estado_pago").default("pendiente"),
    referenciaContrato: text("referencia_contrato"),
    notas: text("notas"),
    creadoPor: uuid("creado_por"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    idempotencyKeyIdx: uniqueIndex("idx_ventas_idempotency_key").on(table.idempotencyKey),
    animalIdx: index("idx_ventas_animal_id").on(table.animalId),
    fk_animal: foreignKey({
      columns: [table.animalId],
      foreignColumns: [bovinos.id],
    }).onDelete("restrict"),
    fk_creado_por: foreignKey({
      columns: [table.creadoPor],
      foreignColumns: [usuarios.id],
    }),
  }),
);

export const consultorReglas = pgTable(
  "consultor_reglas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    categoria: text("categoria").notNull(),
    prioridad: text("prioridad").notNull(),
    condicionSql: text("condicion_sql").notNull(),
    mensajeAlerta: text("mensaje_alerta").notNull(),
    recomendacion: text("recomendacion"),
    activo: integer("activo").default(1),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
);

export type ConsultorRegla = typeof consultorReglas.$inferSelect;
export type ConsultorReglaInsert = typeof consultorReglas.$inferInsert;

export const tipoInsumoEnum = pgEnum("tipo_insumo", [
  "vacuna",
  "desparasitante",
  "antibiotico",
  "antiinflamatorio",
  "vitamina",
  "suplemento",
  "herramienta",
  "otro",
]);

export const insumos = pgTable(
  "insumos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nombre: text("nombre").notNull(),
    tipo: tipoInsumoEnum("tipo").notNull(),
    presentacion: text("presentacion"),
    stockActual: numeric("stock_actual", { precision: 10, scale: 2 }).notNull().default("0"),
    stockMinimo: numeric("stock_minimo", { precision: 10, scale: 2 }).notNull().default("0"),
    unidad: text("unidad").notNull().default("unidad"),
    lote: text("lote"),
    fechaCompra: timestamp("fecha_compra"),
    fechaVencimiento: timestamp("fecha_vencimiento"),
    proveedor: text("proveedor"),
    costoUnitario: numeric("costo_unitario", { precision: 10, scale: 2 }).default("0"),
    notas: text("notas"),
    imagenUrl: text("imagen_url"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    tipoIdx: index("idx_insumos_tipo").on(table.tipo),
    vencimientoIdx: index("idx_insumos_vencimiento").on(table.fechaVencimiento),
    stockIdx: index("idx_insumos_stock").on(table.stockActual),
  }),
);

export type Insumo = typeof insumos.$inferSelect;
export type InsumoInsert = typeof insumos.$inferInsert;

export type MetodoPago = "efectivo" | "transferencia" | "cheque" | "letra" | "qr";

export const configuracion = pgTable(
  "configuracion",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clave: text("clave").notNull().unique(),
    valor: text("valor").notNull().default(""),
    tipo: text("tipo").notNull().default("text"),
    descripcion: text("descripcion").notNull().default(""),
    grupo: text("grupo").notNull().default("general"),
    opciones: text("opciones"),
    editable: integer("editable").notNull().default(1),
    orden: integer("orden").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    claveIdx: uniqueIndex("idx_config_clave").on(table.clave),
    grupoIdx: index("idx_config_grupo").on(table.grupo),
  }),
);

export type Configuracion = typeof configuracion.$inferSelect;
export type ConfiguracionInsert = typeof configuracion.$inferInsert;

export type Finanzas = typeof finanzas.$inferSelect;
export type FinanzasInsert = typeof finanzas.$inferInsert;

export type Venta = typeof ventas.$inferSelect;
export type VentaInsert = typeof ventas.$inferInsert;
