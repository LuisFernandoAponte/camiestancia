import { Hono } from "hono";
import db from "@/db/index.js";
import { pool } from "@/db/index.js";
import { insumos } from "@/db/schema.js";
import { eq, and, desc, countDistinct, lte, gte, lt, gt, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/jwt.js";
import { z } from "zod";
import { PaginationSchema } from "@/lib/schemas.js";
import { AppError } from "@/lib/errors.js";
import logger from "@/utils/logger.js";

export const insumosRoutes = new Hono();

pool.query(`SELECT EXISTS (SELECT FROM pg_class WHERE relname = 'insumos' AND relkind = 'r')`).then((r) => {
  if (r.rows[0].exists) {
    logger.info("Tabla insumos lista");
    pool.query("ALTER TABLE insumos ADD COLUMN IF NOT EXISTS imagen_url TEXT;").catch((err) =>
      logger.error("Error auto-migrando columna imagen_url en insumos:", err)
    );
  } else {
    logger.warn("Tabla insumos no existe. Ejecute las migraciones primero.");
  }
});

const tiposInsumo = ["vacuna", "desparasitante", "antibiotico", "antiinflamatorio", "vitamina", "suplemento", "herramienta", "otro"] as const;
type TipoInsumo = (typeof tiposInsumo)[number];

const InsumoCreateSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido"),
  tipo: z.enum(tiposInsumo),
  presentacion: z.string().optional(),
  stockActual: z.coerce.number().min(0).default(0),
  stockMinimo: z.coerce.number().min(0).default(0),
  unidad: z.string().optional().default("unidad"),
  lote: z.string().optional(),
  fechaCompra: z.string().optional(),
  fechaVencimiento: z.string().optional(),
  proveedor: z.string().optional(),
  costoUnitario: z.coerce.number().min(0).default(0),
  notas: z.string().optional(),
  imagenUrl: z.string().optional().nullable(),
});

const InsumoUpdateSchema = InsumoCreateSchema.partial();

insumosRoutes.get("/", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);

  const { page, limit } = PaginationSchema.parse(c.req.query());
  const tipo = c.req.query("tipo");
  const soloCritico = c.req.query("critico") === "true";
  const soloVencidos = c.req.query("vencidos") === "true";
  const q = c.req.query("q");

  const conditions: any[] = [];
  if (tipo) conditions.push(eq(insumos.tipo, tipo as any));
  if (q) conditions.push(sql`LOWER(nombre) LIKE LOWER(${'%' + q + '%'})`);
  if (soloCritico) conditions.push(sql`stock_actual <= stock_minimo`);
  if (soloVencidos) conditions.push(sql`fecha_vencimiento IS NOT NULL AND fecha_vencimiento <= CURRENT_DATE`);

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (page - 1) * limit;

  try {
    const [{ total }] = await db
      .select({ total: countDistinct(insumos.id) })
      .from(insumos)
      .where(where);

    const data = await db
      .select()
      .from(insumos)
      .where(where)
      .orderBy(desc(insumos.createdAt))
      .limit(limit)
      .offset(offset);

    const totalPages = Math.ceil(total / limit);

    return c.json({
      success: true,
      data: data.map((r) => ({
        id: r.id,
        nombre: r.nombre,
        tipo: r.tipo,
        presentacion: r.presentacion,
        stockActual: parseFloat(r.stockActual.toString()),
        stockMinimo: parseFloat(r.stockMinimo.toString()),
        unidad: r.unidad,
        lote: r.lote,
        fechaCompra: r.fechaCompra,
        fechaVencimiento: r.fechaVencimiento,
        proveedor: r.proveedor,
        costoUnitario: r.costoUnitario ? parseFloat(r.costoUnitario.toString()) : 0,
        notas: r.notas,
        imagenUrl: r.imagenUrl,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      })),
      meta: { page, limit, total, pages: totalPages },
    });
  } catch (error: any) {
    if (error?.message?.includes("relation") && error?.message?.includes("does not exist")) {
      return c.json({ success: true, data: [], meta: { page: 1, limit: 200, total: 0, pages: 0 } });
    }
    throw new AppError("Error listando insumos", "FETCH_ERROR", 500);
  }
});

insumosRoutes.get("/dashboard", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);
  const data = await getAlertasData();
  return c.json({ success: true, data });
});

insumosRoutes.get("/alertas", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);
  const data = await getAlertasData();
  return c.json({ success: true, data });
});

async function getAlertasData() {
  const criticos = await db
    .select()
    .from(insumos)
    .where(sql`stock_actual <= stock_minimo`)
    .orderBy(desc(insumos.stockActual));

  const vencidos = await db
    .select()
    .from(insumos)
    .where(and(
      sql`fecha_vencimiento IS NOT NULL`,
      lte(insumos.fechaVencimiento, new Date()),
    ))
    .orderBy(insumos.fechaVencimiento);

  const porVencer = await db
    .select()
    .from(insumos)
    .where(and(
      sql`fecha_vencimiento IS NOT NULL`,
      gt(insumos.fechaVencimiento, new Date()),
      lte(insumos.fechaVencimiento, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
    ))
    .orderBy(insumos.fechaVencimiento);

  const mapItem = (r: any) => ({
    id: r.id,
    nombre: r.nombre,
    tipo: r.tipo,
    stockActual: r.stockActual != null ? parseFloat(r.stockActual.toString()) : 0,
    stockMinimo: r.stockMinimo != null ? parseFloat(r.stockMinimo.toString()) : 0,
    unidad: r.unidad,
    fechaVencimiento: r.fechaVencimiento,
    lote: r.lote,
    imagenUrl: r.imagenUrl,
  });

  return {
    criticos: criticos.map(mapItem),
    vencidos: vencidos.map(mapItem),
    porVencer: porVencer.map(mapItem),
  };
}


insumosRoutes.post("/", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);
  if (!["admin", "gestor"].includes(user.rol)) throw new AppError("Permiso denegado", "FORBIDDEN", 403);

  try {
    const body = await c.req.json();
    const data = InsumoCreateSchema.parse(body);

    const [newRecord] = await db
      .insert(insumos)
      .values({
        nombre: data.nombre,
        tipo: data.tipo,
        presentacion: data.presentacion || null,
        stockActual: data.stockActual.toString(),
        stockMinimo: data.stockMinimo.toString(),
        unidad: data.unidad,
        lote: data.lote || null,
        fechaCompra: data.fechaCompra ? new Date(data.fechaCompra) : null,
        fechaVencimiento: data.fechaVencimiento ? new Date(data.fechaVencimiento) : null,
        proveedor: data.proveedor || null,
        costoUnitario: data.costoUnitario.toString(),
        notas: data.notas || null,
        imagenUrl: data.imagenUrl || null,
      })
      .returning();

    logger.info(`Insumo creado: ${data.nombre} (${data.tipo})`);

    return c.json({
      success: true,
      data: {
        id: newRecord.id,
        nombre: newRecord.nombre,
        tipo: newRecord.tipo,
        presentacion: newRecord.presentacion,
        stockActual: parseFloat(newRecord.stockActual.toString()),
        stockMinimo: parseFloat(newRecord.stockMinimo.toString()),
        unidad: newRecord.unidad,
        lote: newRecord.lote,
        fechaCompra: newRecord.fechaCompra,
        fechaVencimiento: newRecord.fechaVencimiento,
        proveedor: newRecord.proveedor,
        costoUnitario: newRecord.costoUnitario ? parseFloat(newRecord.costoUnitario.toString()) : 0,
        notas: newRecord.notas,
        imagenUrl: newRecord.imagenUrl,
        createdAt: newRecord.createdAt,
        updatedAt: newRecord.updatedAt,
      },
    }, 201);
  } catch (error) {
    throw error;
  }
});

insumosRoutes.put("/:id", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);
  if (!["admin", "gestor"].includes(user.rol)) throw new AppError("Permiso denegado", "FORBIDDEN", 403);

  const id = c.req.param("id");

  try {
    const [existing] = await db.select().from(insumos).where(eq(insumos.id, id));
    if (!existing) throw new AppError("Insumo no encontrado", "NOT_FOUND", 404);

    const body = await c.req.json();
    const data = InsumoUpdateSchema.parse(body);

    const updateData: Record<string, any> = {};
    if (data.nombre !== undefined) updateData.nombre = data.nombre;
    if (data.tipo !== undefined) updateData.tipo = data.tipo;
    if (data.presentacion !== undefined) updateData.presentacion = data.presentacion;
    if (data.stockActual !== undefined) updateData.stockActual = data.stockActual.toString();
    if (data.stockMinimo !== undefined) updateData.stockMinimo = data.stockMinimo.toString();
    if (data.unidad !== undefined) updateData.unidad = data.unidad;
    if (data.lote !== undefined) updateData.lote = data.lote;
    if (data.fechaCompra !== undefined) updateData.fechaCompra = data.fechaCompra ? new Date(data.fechaCompra) : null;
    if (data.fechaVencimiento !== undefined) updateData.fechaVencimiento = data.fechaVencimiento ? new Date(data.fechaVencimiento) : null;
    if (data.proveedor !== undefined) updateData.proveedor = data.proveedor;
    if (data.costoUnitario !== undefined) updateData.costoUnitario = data.costoUnitario.toString();
    if (data.notas !== undefined) updateData.notas = data.notas;
    if (data.imagenUrl !== undefined) updateData.imagenUrl = data.imagenUrl || null;
    updateData.updatedAt = new Date();

    const [updated] = await db
      .update(insumos)
      .set(updateData)
      .where(eq(insumos.id, id))
      .returning();

    return c.json({
      success: true,
      data: {
        id: updated.id,
        nombre: updated.nombre,
        tipo: updated.tipo,
        presentacion: updated.presentacion,
        stockActual: parseFloat(updated.stockActual.toString()),
        stockMinimo: parseFloat(updated.stockMinimo.toString()),
        unidad: updated.unidad,
        lote: updated.lote,
        fechaCompra: updated.fechaCompra,
        fechaVencimiento: updated.fechaVencimiento,
        proveedor: updated.proveedor,
        costoUnitario: updated.costoUnitario ? parseFloat(updated.costoUnitario.toString()) : 0,
        notas: updated.notas,
        imagenUrl: updated.imagenUrl,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    throw error;
  }
});

insumosRoutes.delete("/:id", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);
  if (user.rol !== "admin") throw new AppError("Solo admin puede eliminar", "FORBIDDEN", 403);

  const id = c.req.param("id");

  try {
    const [existing] = await db.select().from(insumos).where(eq(insumos.id, id));
    if (!existing) throw new AppError("Insumo no encontrado", "NOT_FOUND", 404);

    await db.delete(insumos).where(eq(insumos.id, id));
    return c.json({ success: true, message: "Insumo eliminado exitosamente" });
  } catch (error) {
    throw error;
  }
});

export default insumosRoutes;
