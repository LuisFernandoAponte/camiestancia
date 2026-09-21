CREATE TYPE "public"."calidad_seminal" AS ENUM('A', 'S', 'E', 'B');--> statement-breakpoint
CREATE TYPE "public"."color_bovino" AS ENUM('BC', 'CL', 'CO', 'OV', 'NE', 'BR', 'OT');--> statement-breakpoint
CREATE TYPE "public"."estado_bovino" AS ENUM('activo', 'disponible', 'vendido', 'cuarentena', 'preñez', 'fallecido');--> statement-breakpoint
CREATE TYPE "public"."estado_reproduccion" AS ENUM('confirmada', 'evaluacion', 'aborto', 'parto_realizado', 'descartada');--> statement-breakpoint
CREATE TYPE "public"."estado_salud" AS ENUM('pendiente', 'aplicado', 'cancelado', 'reprogramado');--> statement-breakpoint
CREATE TYPE "public"."metodo_pago" AS ENUM('efectivo', 'transferencia', 'cheque', 'letra', 'qr');--> statement-breakpoint
CREATE TYPE "public"."resultado_diagnostico" AS ENUM('preñada', 'vacia', 'aborto', 'no_confirmado');--> statement-breakpoint
CREATE TYPE "public"."resultado_iatf" AS ENUM('positivo', 'negativo', 'pendiente');--> statement-breakpoint
CREATE TYPE "public"."tipo_bovino" AS ENUM('vaca', 'vaquilla', 'toro', 'novillo', 'ternero', 'ternera');--> statement-breakpoint
CREATE TYPE "public"."tipo_diagnostico" AS ENUM('tacto', 'ecografia');--> statement-breakpoint
CREATE TYPE "public"."tipo_evento_reproductivo" AS ENUM('servicio_natural', 'iatf', 'parto', 'destete', 'aborto', 'diagnostico');--> statement-breakpoint
CREATE TYPE "public"."tipo_insumo" AS ENUM('vacuna', 'desparasitante', 'antibiotico', 'antiinflamatorio', 'vitamina', 'suplemento', 'herramienta', 'otro');--> statement-breakpoint
CREATE TYPE "public"."tipo_salud" AS ENUM('vacuna', 'desparasitacion', 'chequeo', 'tratamiento');--> statement-breakpoint
CREATE TYPE "public"."tipo_servicio" AS ENUM('iatf', 'servicio_natural', 'transferencia_embrion');--> statement-breakpoint
CREATE TABLE "bovinos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chip" text NOT NULL,
	"numero_identificacion" text,
	"nombre" text,
	"raza" text,
	"sexo" text,
	"color" "color_bovino",
	"tipo" "tipo_bovino",
	"nacimiento" timestamp,
	"peso_inicial" numeric(6, 2),
	"peso_actual" numeric(6, 2),
	"potrero" text,
	"madre_id" uuid,
	"padre_id" uuid,
	"estado" "estado_bovino" DEFAULT 'activo',
	"descartado" boolean DEFAULT false,
	"motivo_descarte" text,
	"precio" numeric(10, 2) DEFAULT '0',
	"foto" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "bovinos_chip_unique" UNIQUE("chip")
);
--> statement-breakpoint
CREATE TABLE "configuracion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clave" text NOT NULL,
	"valor" text DEFAULT '' NOT NULL,
	"tipo" text DEFAULT 'text' NOT NULL,
	"descripcion" text DEFAULT '' NOT NULL,
	"grupo" text DEFAULT 'general' NOT NULL,
	"opciones" text,
	"editable" integer DEFAULT 1 NOT NULL,
	"orden" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "configuracion_clave_unique" UNIQUE("clave")
);
--> statement-breakpoint
CREATE TABLE "consultor_reglas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"categoria" text NOT NULL,
	"prioridad" text NOT NULL,
	"condicion_sql" text NOT NULL,
	"mensaje_alerta" text NOT NULL,
	"recomendacion" text,
	"activo" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "diagnosticos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"animal_id" uuid NOT NULL,
	"reproduccion_id" uuid,
	"fecha_diagnostico" timestamp NOT NULL,
	"tipo_diagnostico" "tipo_diagnostico" NOT NULL,
	"resultado" "resultado_diagnostico" NOT NULL,
	"edad_gestacional_dias" integer,
	"observaciones" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "eventos_reproductivos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"animal_id" uuid NOT NULL,
	"fecha_evento" timestamp NOT NULL,
	"tipo_evento" "tipo_evento_reproductivo" NOT NULL,
	"toro_id" uuid,
	"descripcion" text,
	"resultado" text,
	"observaciones" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "finanzas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lote" text NOT NULL,
	"mes" integer,
	"anio" integer,
	"ingresos" numeric(12, 2) DEFAULT '0',
	"egresos" numeric(12, 2) DEFAULT '0',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gastos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lote" text NOT NULL,
	"mes" integer NOT NULL,
	"anio" integer NOT NULL,
	"categoria" text NOT NULL,
	"descripcion" text,
	"monto" numeric(12, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "insumos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"tipo" "tipo_insumo" NOT NULL,
	"presentacion" text,
	"stock_actual" numeric(10, 2) DEFAULT '0' NOT NULL,
	"stock_minimo" numeric(10, 2) DEFAULT '0' NOT NULL,
	"unidad" text DEFAULT 'unidad' NOT NULL,
	"lote" text,
	"fecha_compra" timestamp,
	"fecha_vencimiento" timestamp,
	"proveedor" text,
	"costo_unitario" numeric(10, 2) DEFAULT '0',
	"notas" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reproduccion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hembra_id" uuid NOT NULL,
	"toro_id" uuid,
	"padre_id" uuid,
	"fecha_inseminacion" timestamp NOT NULL,
	"ciclo_numero" integer DEFAULT 1,
	"resultado" "resultado_iatf" DEFAULT 'pendiente',
	"tipo_servicio" "tipo_servicio" DEFAULT 'iatf',
	"dias_gestacion" integer,
	"parto_estimado" timestamp,
	"fecha_diagnostico" timestamp,
	"estado" "estado_reproduccion" DEFAULT 'confirmada',
	"observaciones" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "salud" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"animal_id" uuid NOT NULL,
	"tipo" "tipo_salud" NOT NULL,
	"fecha" timestamp NOT NULL,
	"proxima_fecha" timestamp,
	"veterinario" text,
	"estado" "estado_salud" DEFAULT 'pendiente',
	"notas" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "toros" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bovino_id" uuid NOT NULL,
	"codigo" text,
	"nombre" text,
	"raza" text,
	"fecha_nacimiento" timestamp,
	"fecha_evaluacion" timestamp,
	"peso_evaluacion" numeric(6, 2),
	"circunferencia_escrotal" numeric(5, 1),
	"calidad_seminal" "calidad_seminal",
	"categoria" text,
	"activo" boolean DEFAULT true,
	"descartado" boolean DEFAULT false,
	"motivo_descarte" text,
	"observaciones" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "toros_bovino_id_unique" UNIQUE("bovino_id")
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"rol" text DEFAULT 'gestor' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vaquillas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bovino_id" uuid NOT NULL,
	"tat" text,
	"fecha_nacimiento" timestamp,
	"padre_id" uuid,
	"madre_id" uuid,
	"color" "color_bovino",
	"numero_lote" integer,
	"observaciones" text,
	"estado" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vaquillas_bovino_id_unique" UNIQUE("bovino_id")
);
--> statement-breakpoint
CREATE TABLE "ventas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"idempotency_key" text,
	"animal_id" uuid NOT NULL,
	"comprador_nombre" text NOT NULL,
	"comprador_documento" text,
	"comprador_telefono" text,
	"comprador_email" text,
	"comprador_finca" text,
	"fecha_venta" date DEFAULT now() NOT NULL,
	"precio_venta" numeric(10, 2) NOT NULL,
	"metodo_pago" "metodo_pago" NOT NULL,
	"estado_pago" text DEFAULT 'pendiente',
	"referencia_contrato" text,
	"notas" text,
	"creado_por" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ventas_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
ALTER TABLE "bovinos" ADD CONSTRAINT "bovinos_madre_id_bovinos_id_fk" FOREIGN KEY ("madre_id") REFERENCES "public"."bovinos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bovinos" ADD CONSTRAINT "bovinos_padre_id_bovinos_id_fk" FOREIGN KEY ("padre_id") REFERENCES "public"."bovinos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagnosticos" ADD CONSTRAINT "diagnosticos_animal_id_bovinos_id_fk" FOREIGN KEY ("animal_id") REFERENCES "public"."bovinos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagnosticos" ADD CONSTRAINT "diagnosticos_reproduccion_id_reproduccion_id_fk" FOREIGN KEY ("reproduccion_id") REFERENCES "public"."reproduccion"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eventos_reproductivos" ADD CONSTRAINT "eventos_reproductivos_animal_id_bovinos_id_fk" FOREIGN KEY ("animal_id") REFERENCES "public"."bovinos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eventos_reproductivos" ADD CONSTRAINT "eventos_reproductivos_toro_id_bovinos_id_fk" FOREIGN KEY ("toro_id") REFERENCES "public"."bovinos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reproduccion" ADD CONSTRAINT "reproduccion_hembra_id_bovinos_id_fk" FOREIGN KEY ("hembra_id") REFERENCES "public"."bovinos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reproduccion" ADD CONSTRAINT "reproduccion_toro_id_bovinos_id_fk" FOREIGN KEY ("toro_id") REFERENCES "public"."bovinos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reproduccion" ADD CONSTRAINT "reproduccion_padre_id_bovinos_id_fk" FOREIGN KEY ("padre_id") REFERENCES "public"."bovinos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salud" ADD CONSTRAINT "salud_animal_id_bovinos_id_fk" FOREIGN KEY ("animal_id") REFERENCES "public"."bovinos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "toros" ADD CONSTRAINT "toros_bovino_id_bovinos_id_fk" FOREIGN KEY ("bovino_id") REFERENCES "public"."bovinos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vaquillas" ADD CONSTRAINT "vaquillas_bovino_id_bovinos_id_fk" FOREIGN KEY ("bovino_id") REFERENCES "public"."bovinos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vaquillas" ADD CONSTRAINT "vaquillas_padre_id_bovinos_id_fk" FOREIGN KEY ("padre_id") REFERENCES "public"."bovinos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vaquillas" ADD CONSTRAINT "vaquillas_madre_id_bovinos_id_fk" FOREIGN KEY ("madre_id") REFERENCES "public"."bovinos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_animal_id_bovinos_id_fk" FOREIGN KEY ("animal_id") REFERENCES "public"."bovinos"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ventas" ADD CONSTRAINT "ventas_creado_por_usuarios_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_bovinos_chip" ON "bovinos" USING btree ("chip");--> statement-breakpoint
CREATE INDEX "idx_bovinos_estado" ON "bovinos" USING btree ("estado");--> statement-breakpoint
CREATE INDEX "idx_bovinos_madre" ON "bovinos" USING btree ("madre_id");--> statement-breakpoint
CREATE INDEX "idx_bovinos_padre" ON "bovinos" USING btree ("padre_id");--> statement-breakpoint
CREATE INDEX "idx_bovinos_tipo" ON "bovinos" USING btree ("tipo");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_config_clave" ON "configuracion" USING btree ("clave");--> statement-breakpoint
CREATE INDEX "idx_config_grupo" ON "configuracion" USING btree ("grupo");--> statement-breakpoint
CREATE INDEX "idx_diagnosticos_animal" ON "diagnosticos" USING btree ("animal_id");--> statement-breakpoint
CREATE INDEX "idx_eventos_animal" ON "eventos_reproductivos" USING btree ("animal_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_finanzas_unique_lote_mes_anio" ON "finanzas" USING btree ("lote","mes","anio");--> statement-breakpoint
CREATE INDEX "idx_insumos_tipo" ON "insumos" USING btree ("tipo");--> statement-breakpoint
CREATE INDEX "idx_insumos_vencimiento" ON "insumos" USING btree ("fecha_vencimiento");--> statement-breakpoint
CREATE INDEX "idx_insumos_stock" ON "insumos" USING btree ("stock_actual");--> statement-breakpoint
CREATE INDEX "idx_reproduccion_hembra" ON "reproduccion" USING btree ("hembra_id");--> statement-breakpoint
CREATE INDEX "idx_reproduccion_ciclo" ON "reproduccion" USING btree ("ciclo_numero");--> statement-breakpoint
CREATE INDEX "idx_reproduccion_resultado" ON "reproduccion" USING btree ("resultado");--> statement-breakpoint
CREATE INDEX "idx_salud_animal_id" ON "salud" USING btree ("animal_id");--> statement-breakpoint
CREATE INDEX "idx_toros_activo" ON "toros" USING btree ("activo");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_usuarios_email" ON "usuarios" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_ventas_idempotency_key" ON "ventas" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "idx_ventas_animal_id" ON "ventas" USING btree ("animal_id");