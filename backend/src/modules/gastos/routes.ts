import { Hono } from "hono";
import db from "@/db/index.js";
import { pool } from "@/db/index.js";
import { gastos } from "@/db/schema.js";
import { eq, and, desc, countDistinct } from "drizzle-orm";
import { getCurrentUser } from "@/lib/jwt.js";
import { z } from "zod";
import { PaginationSchema } from "@/lib/schemas.js";
import { AppError } from "@/lib/errors.js";
import logger from "@/utils/logger.js";

export const gastosRoutes = new Hono();

// Intentar crear la tabla al iniciar
pool.query(`
  CREATE TABLE IF NOT EXISTS gastos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lote TEXT NOT NULL,
    mes INTEGER NOT NULL,
    anio INTEGER NOT NULL,
    categoria TEXT NOT NULL,
    descripcion TEXT,
    monto NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT now()
  )
`).then(() => logger.info("Tabla gastos lista")).catch(() => {});

const categorias = ["remedios", "trabajador", "alimentacion", "mantenimiento", "transporte", "otros"] as const;
type Categoria = (typeof categorias)[number];

const GastosCreateSchema = z.object({
  lote: z.string().optional().default(""),
  mes: z.coerce.number().int().min(1).max(12),
  anio: z.coerce.number().int().min(2020),
  categoria: z.enum(categorias),
  descripcion: z.string().optional(),
  monto: z.coerce.number().min(0, "Monto debe ser positivo").default(0),
});

const GastosUpdateSchema = GastosCreateSchema.partial();

gastosRoutes.get("/", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);

  const { page, limit } = PaginationSchema.parse(c.req.query());
  const lote = c.req.query("lote");
  const mes = c.req.query("mes");
  const anio = c.req.query("anio");
  const categoria = c.req.query("categoria");

  const conditions: any[] = [];
  if (lote) conditions.push(eq(gastos.lote, lote));
  if (mes) conditions.push(eq(gastos.mes, parseInt(mes)));
  if (anio) conditions.push(eq(gastos.anio, parseInt(anio)));
  if (categoria) conditions.push(eq(gastos.categoria, categoria));

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (page - 1) * limit;

  try {
    const [{ total }] = await db
      .select({ total: countDistinct(gastos.id) })
      .from(gastos)
      .where(where);

    const data = await db
      .select()
      .from(gastos)
      .where(where)
      .orderBy(desc(gastos.createdAt))
      .limit(limit)
      .offset(offset);

    const totalPages = Math.ceil(total / limit);

    return c.json({
      success: true,
      data: data.map((r) => ({
        id: r.id,
        lote: r.lote,
        mes: r.mes,
        anio: r.anio,
        categoria: r.categoria,
        descripcion: r.descripcion,
        monto: parseFloat(r.monto.toString()),
        createdAt: r.createdAt,
      })),
      meta: { page, limit, total, pages: totalPages },
    });
  } catch (error) {
    throw new AppError("Error listando gastos", "FETCH_ERROR", 500);
  }
});

gastosRoutes.get("/resumen", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);

  const mes = parseInt(c.req.query("mes") || String(new Date().getMonth() + 1));
  const anio = parseInt(c.req.query("anio") || String(new Date().getFullYear()));

  try {
    const data = await db
      .select()
      .from(gastos)
      .where(and(eq(gastos.mes, mes), eq(gastos.anio, anio)));

    const porCategoria: Record<string, number> = {};
    let total = 0;

    for (const r of data) {
      const monto = parseFloat(r.monto.toString());
      porCategoria[r.categoria] = (porCategoria[r.categoria] || 0) + monto;
      total += monto;
    }

    const detalle = categorias.map((cat) => ({
      categoria: cat,
      monto: porCategoria[cat] || 0,
    }));

    return c.json({
      success: true,
      data: { mes, anio, total, detalle },
    });
  } catch (error) {
    throw new AppError("Error obteniendo resumen de gastos", "FETCH_ERROR", 500);
  }
});

gastosRoutes.post("/", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);
  if (!["admin", "gestor"].includes(user.rol)) throw new AppError("Permiso denegado", "FORBIDDEN", 403);

  try {
    const body = await c.req.json();
    const data = GastosCreateSchema.parse(body);

    const [newRecord] = await db
      .insert(gastos)
      .values({
        lote: data.lote,
        mes: data.mes,
        anio: data.anio,
        categoria: data.categoria,
        descripcion: data.descripcion || null,
        monto: data.monto.toString(),
      })
      .returning();

    logger.info(`Gasto creado: ${data.lote} ${data.categoria} $${data.monto}`);

    return c.json({
      success: true,
      data: {
        id: newRecord.id,
        lote: newRecord.lote,
        mes: newRecord.mes,
        anio: newRecord.anio,
        categoria: newRecord.categoria,
        descripcion: newRecord.descripcion,
        monto: parseFloat(newRecord.monto.toString()),
        createdAt: newRecord.createdAt,
      },
    }, 201);
  } catch (error) {
    throw error;
  }
});

gastosRoutes.put("/:id", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);
  if (!["admin", "gestor"].includes(user.rol)) throw new AppError("Permiso denegado", "FORBIDDEN", 403);

  const id = c.req.param("id");

  try {
    const [existing] = await db.select().from(gastos).where(eq(gastos.id, id));
    if (!existing) throw new AppError("Gasto no encontrado", "NOT_FOUND", 404);

    const body = await c.req.json();
    const data = GastosUpdateSchema.parse(body);

    const updateData: any = {};
    if (data.lote !== undefined) updateData.lote = data.lote;
    if (data.mes !== undefined) updateData.mes = data.mes;
    if (data.anio !== undefined) updateData.anio = data.anio;
    if (data.categoria !== undefined) updateData.categoria = data.categoria;
    if (data.descripcion !== undefined) updateData.descripcion = data.descripcion;
    if (data.monto !== undefined) updateData.monto = data.monto.toString();

    const [updated] = await db
      .update(gastos)
      .set(updateData)
      .where(eq(gastos.id, id))
      .returning();

    return c.json({
      success: true,
      data: {
        id: updated.id,
        lote: updated.lote,
        mes: updated.mes,
        anio: updated.anio,
        categoria: updated.categoria,
        descripcion: updated.descripcion,
        monto: parseFloat(updated.monto.toString()),
        createdAt: updated.createdAt,
      },
    });
  } catch (error) {
    throw error;
  }
});

gastosRoutes.delete("/:id", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);
  if (user.rol !== "admin") throw new AppError("Solo admin puede eliminar", "FORBIDDEN", 403);

  const id = c.req.param("id");

  try {
    const [existing] = await db.select().from(gastos).where(eq(gastos.id, id));
    if (!existing) throw new AppError("Gasto no encontrado", "NOT_FOUND", 404);

    await db.delete(gastos).where(eq(gastos.id, id));
    return c.json({ success: true, message: "Gasto eliminado exitosamente" });
  } catch (error) {
    throw error;
  }
});

export default gastosRoutes;
