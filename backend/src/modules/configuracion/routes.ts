import { Hono } from "hono";
import { eq, asc } from "drizzle-orm";
import { z } from "zod";
import db, { pool } from "@/db/index.js";
import { configuracion } from "@/db/schema.js";
import { getCurrentUser } from "@/lib/jwt.js";
import { AppError } from "@/lib/errors.js";
import logger from "@/utils/logger.js";

const CONFIG_SEEDS = [
  { clave: "farm_name", valor: "La Estancia", tipo: "text", descripcion: "Nombre de la finca o empresa", grupo: "general", orden: 1 },
  { clave: "farm_address", valor: "", tipo: "text", descripcion: "Dirección física de la finca", grupo: "general", orden: 2 },
  { clave: "farm_phone", valor: "", tipo: "text", descripcion: "Teléfono de contacto", grupo: "general", orden: 3 },
  { clave: "farm_email", valor: "", tipo: "email", descripcion: "Correo electrónico de la empresa", grupo: "general", orden: 4 },
  { clave: "currency", valor: "Bs.", tipo: "text", descripcion: "Símbolo de moneda local", grupo: "general", orden: 5 },
  { clave: "locale", valor: "es-BO", tipo: "text", descripcion: "Código de localización (idioma/país)", grupo: "general", orden: 6 },
  { clave: "whatsapp_notifications", valor: "true", tipo: "boolean", descripcion: "Activar notificaciones por WhatsApp", grupo: "notificaciones", orden: 7 },
  { clave: "whatsapp_phone", valor: "", tipo: "text", descripcion: "Número de WhatsApp para notificaciones", grupo: "notificaciones", orden: 8 },
  { clave: "email_alerts", valor: "true", tipo: "boolean", descripcion: "Activar alertas por correo electrónico", grupo: "notificaciones", orden: 9 },
  { clave: "alert_before_vaccination_days", valor: "7", tipo: "number", descripcion: "Días antes para recordatorio de vacunación", grupo: "notificaciones", orden: 10 },
  { clave: "alert_low_stock", valor: "true", tipo: "boolean", descripcion: "Alertar cuando el stock de insumos esté bajo", grupo: "notificaciones", orden: 11 },
  { clave: "default_stock_minimum", valor: "5", tipo: "number", descripcion: "Stock mínimo por defecto para insumos", grupo: "inventario", orden: 12 },
  { clave: "weight_unit", valor: "kg", tipo: "select", descripcion: "Unidad de peso para bovinos", grupo: "inventario", orden: 13, opciones: '["kg","lb","@"]' },
  { clave: "vaccination_reminder_days", valor: "30", tipo: "number", descripcion: "Días para recordatorio de próxima vacuna", grupo: "salud", orden: 14 },
  { clave: "health_check_interval_days", valor: "90", tipo: "number", descripcion: "Intervalo en días entre chequeos de rutina", grupo: "salud", orden: 15 },
  { clave: "tax_rate", valor: "0", tipo: "number", descripcion: "Tasa de impuesto aplicada (%)", grupo: "finanzas", orden: 16 },
  { clave: "default_payment_terms", valor: "contado", tipo: "select", descripcion: "Condición de pago por defecto", grupo: "finanzas", orden: 17, opciones: '["contado","15 días","30 días","60 días"]' },
];

const UpdateConfigSchema = z.object({
  clave: z.string().min(1),
  valor: z.string(),
});

const BulkUpdateSchema = z.object({
  items: z.array(UpdateConfigSchema),
});

export const configuracionRoutes = new Hono();

async function initConfigTable() {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS configuracion (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      clave VARCHAR(100) UNIQUE NOT NULL,
      valor TEXT NOT NULL DEFAULT '',
      tipo VARCHAR(20) NOT NULL DEFAULT 'text',
      descripcion TEXT NOT NULL DEFAULT '',
      grupo VARCHAR(50) NOT NULL DEFAULT 'general',
      opciones TEXT,
      editable INTEGER NOT NULL DEFAULT 1,
      orden INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    )`);

    for (const seed of CONFIG_SEEDS) {
      const [existing] = await db.select({ id: configuracion.id }).from(configuracion).where(eq(configuracion.clave, seed.clave)).limit(1);
      if (!existing) {
        await db.insert(configuracion).values({
          ...seed,
          editable: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    logger.info("[CONFIG] OK - Inicializada");
  } catch (e) {
    logger.warn(`[CONFIG] No se pudo inicializar: ${(e as Error).message}`);
  }
}

initConfigTable();

configuracionRoutes.get("/", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);

  const rows = await db.select().from(configuracion).orderBy(asc(configuracion.orden));
  const grouped: Record<string, any[]> = {};

  for (const row of rows) {
    const g = row.grupo || "general";
    if (!grouped[g]) grouped[g] = [];
    grouped[g].push({
      id: row.id,
      clave: row.clave,
      valor: row.valor,
      tipo: row.tipo,
      descripcion: row.descripcion,
      opciones: row.opciones ? JSON.parse(row.opciones) : null,
      editable: row.editable === 1,
      orden: row.orden,
    });
  }

  return c.json({ success: true, data: grouped });
});

configuracionRoutes.get("/:grupo", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);

  const grupo = c.req.param("grupo");
  const rows = await db
    .select()
    .from(configuracion)
    .where(eq(configuracion.grupo, grupo))
    .orderBy(asc(configuracion.orden));

  return c.json({
    success: true,
    data: rows.map((r) => ({
      id: r.id,
      clave: r.clave,
      valor: r.valor,
      tipo: r.tipo,
      descripcion: r.descripcion,
      opciones: r.opciones ? JSON.parse(r.opciones) : null,
      editable: r.editable === 1,
      orden: r.orden,
    })),
  });
});

configuracionRoutes.put("/:clave", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);
  if (user.rol !== "admin") throw new AppError("Solo administradores pueden modificar la configuración", "FORBIDDEN", 403);

  const clave = c.req.param("clave");
  const body = await c.req.json();
  const { valor } = z.object({ valor: z.string().max(500) }).parse(body);

  const [existing] = await db.select().from(configuracion).where(eq(configuracion.clave, clave)).limit(1);
  if (!existing) throw new AppError("Configuración no encontrada", "NOT_FOUND", 404);
  if (existing.editable !== 1) throw new AppError("Esta configuración no es editable", "FORBIDDEN", 403);

  await db.update(configuracion).set({ valor, updatedAt: new Date() }).where(eq(configuracion.clave, clave));

  logger.info(`[CONFIG] ${clave} = ${valor}`);
  return c.json({ success: true, data: { clave, valor } });
});

configuracionRoutes.put("/", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);
  if (user.rol !== "admin") throw new AppError("Solo administradores pueden modificar la configuración", "FORBIDDEN", 403);

  const body = await c.req.json();
  const { items } = BulkUpdateSchema.parse(body);

  for (const item of items) {
    const [existing] = await db.select().from(configuracion).where(eq(configuracion.clave, item.clave)).limit(1);
    if (existing && existing.editable === 1) {
      await db.update(configuracion).set({ valor: item.valor, updatedAt: new Date() }).where(eq(configuracion.clave, item.clave));
    }
  }

  logger.info(`Configuración batch actualizada: ${items.length} items`);
  return c.json({ success: true, message: `${items.length} valores actualizados` });
});

export default configuracionRoutes;
