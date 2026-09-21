import { Hono } from "hono";
import db from "@/db/index.js";
import { toros, bovinos, reproduccion } from "@/db/schema.js";
import { eq, and, count, desc, ilike, or, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/jwt.js";
import { ToroCreateSchema, ToroUpdateSchema, PaginationSchema } from "@/lib/schemas.js";
import { AppError } from "@/lib/errors.js";
import logger from "@/utils/logger.js";

export const torosRoutes = new Hono();

torosRoutes.get("/", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);

  try {
    const { page, limit } = PaginationSchema.parse(c.req.query());
    const offset = (page - 1) * limit;
    const activo = c.req.query("activo");
    const descartado = c.req.query("descartado");
    const q = c.req.query("q");

    const conditions: any[] = [];
    if (activo !== undefined) conditions.push(eq(toros.activo, activo === "true"));
    if (descartado !== undefined) conditions.push(eq(toros.descartado, descartado === "true"));
    if (q) {
      conditions.push(
        or(
          ilike(toros.nombre, `%${q}%`),
          ilike(toros.codigo, `%${q}%`),
          ilike(toros.raza, `%${q}%`),
        ),
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ total }] = await db
      .select({ total: count() })
      .from(toros)
      .where(where);

    const data = await db
      .select({
        id: toros.id,
        bovinoId: toros.bovinoId,
        codigo: toros.codigo,
        nombre: toros.nombre,
        raza: toros.raza,
        fechaNacimiento: toros.fechaNacimiento,
        fechaEvaluacion: toros.fechaEvaluacion,
        pesoEvaluacion: toros.pesoEvaluacion,
        circunferenciaEscrotal: toros.circunferenciaEscrotal,
        calidadSeminal: toros.calidadSeminal,
        categoria: toros.categoria,
        activo: toros.activo,
        descartado: toros.descartado,
        motivoDescarte: toros.motivoDescarte,
        observaciones: toros.observaciones,
        chipBovino: bovinos.chip,
        nombreBovino: bovinos.nombre,
        totalServicios: sql`(SELECT COUNT(*) FROM ${reproduccion} WHERE ${reproduccion.toroId} = ${toros.bovinoId})`.mapWith(Number),
      })
      .from(toros)
      .leftJoin(bovinos, eq(toros.bovinoId, bovinos.id))
      .where(where)
      .orderBy(desc(toros.createdAt))
      .limit(limit)
      .offset(offset);

    return c.json({
      success: true,
      data,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    throw error;
  }
});

torosRoutes.get("/:id", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);

  const id = c.req.param("id");

  try {
    const [toro] = await db
      .select()
      .from(toros)
      .where(eq(toros.id, id));

    if (!toro) throw new AppError("Toro no encontrado", "NOT_FOUND", 404);

    const servicios = await db
      .select({
        id: reproduccion.id,
        hembraId: reproduccion.hembraId,
        fechaInseminacion: reproduccion.fechaInseminacion,
        cicloNumero: reproduccion.cicloNumero,
        resultado: reproduccion.resultado,
        estado: reproduccion.estado,
      })
      .from(reproduccion)
      .where(eq(reproduccion.toroId, toro.bovinoId))
      .orderBy(desc(reproduccion.fechaInseminacion));

    return c.json({
      success: true,
      data: { ...toro, servicios },
    });
  } catch (error) {
    throw error;
  }
});

torosRoutes.post("/", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);
  if (!["admin", "gestor"].includes(user.rol)) throw new AppError("Permiso denegado", "FORBIDDEN", 403);

  try {
    const body = await c.req.json();
    const data = ToroCreateSchema.parse(body);

    const [newToro] = await db.insert(toros).values(data as any).returning();
    logger.info(`Toro registrado: ${newToro.nombre}`);

    return c.json({ success: true, data: newToro, message: "Toro registrado exitosamente" }, 201);
  } catch (error) {
    throw error;
  }
});

torosRoutes.put("/:id", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);
  if (!["admin", "gestor"].includes(user.rol)) throw new AppError("Permiso denegado", "FORBIDDEN", 403);

  const id = c.req.param("id");

  try {
    const [existing] = await db.select().from(toros).where(eq(toros.id, id));
    if (!existing) throw new AppError("Toro no encontrado", "NOT_FOUND", 404);

    const body = await c.req.json();
    const data = ToroUpdateSchema.parse(body);

    const [updated] = await db
      .update(toros)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(toros.id, id))
      .returning();

    logger.info(`Toro actualizado: ${updated.nombre}`);
    return c.json({ success: true, data: updated, message: "Toro actualizado exitosamente" });
  } catch (error) {
    throw error;
  }
});

torosRoutes.delete("/:id", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);
  if (user.rol !== "admin") throw new AppError("Solo admin puede eliminar", "FORBIDDEN", 403);

  const id = c.req.param("id");

  try {
    const [existing] = await db.select().from(toros).where(eq(toros.id, id));
    if (!existing) throw new AppError("Toro no encontrado", "NOT_FOUND", 404);

    await db.delete(toros).where(eq(toros.id, id));
    logger.info(`Toro eliminado: ${existing.nombre}`);
    return c.json({ success: true, message: "Toro eliminado exitosamente" });
  } catch (error) {
    throw error;
  }
});

export default torosRoutes;
