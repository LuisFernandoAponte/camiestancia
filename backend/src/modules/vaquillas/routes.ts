import { Hono } from "hono";
import db from "@/db/index.js";
import { vaquillas, bovinos } from "@/db/schema.js";
import { eq, and, count, desc, ilike, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getCurrentUser } from "@/lib/jwt.js";
import { VaquillaCreateSchema, VaquillaUpdateSchema, PaginationSchema } from "@/lib/schemas.js";
import { AppError } from "@/lib/errors.js";
import logger from "@/utils/logger.js";

const padreBovinos = alias(bovinos, "padre_bovinos_vaq");
const madreBovinos = alias(bovinos, "madre_bovinos_vaq");

export const vaquillasRoutes = new Hono();

vaquillasRoutes.get("/", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);

  try {
    const { page, limit } = PaginationSchema.parse(c.req.query());
    const offset = (page - 1) * limit;
    const q = c.req.query("q");
    const estado = c.req.query("estado");

    const conditions: any[] = [];
    if (q) {
      conditions.push(
        or(
          ilike(vaquillas.tat, `%${q}%`),
          ilike(bovinos.nombre, `%${q}%`),
          ilike(bovinos.chip, `%${q}%`),
        ),
      );
    }
    if (estado) conditions.push(eq(vaquillas.estado, estado));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ total }] = await db
      .select({ total: count() })
      .from(vaquillas)
      .leftJoin(bovinos, eq(vaquillas.bovinoId, bovinos.id))
      .where(where);

    const data = await db
      .select({
        id: vaquillas.id,
        bovinoId: vaquillas.bovinoId,
        tat: vaquillas.tat,
        nombreBovino: bovinos.nombre,
        chipBovino: bovinos.chip,
        fechaNacimiento: vaquillas.fechaNacimiento,
        color: vaquillas.color,
        numeroLote: vaquillas.numeroLote,
        estado: vaquillas.estado,
        observaciones: vaquillas.observaciones,
        padreId: vaquillas.padreId,
        padre: padreBovinos.nombre,
        padreChip: padreBovinos.chip,
        madreId: vaquillas.madreId,
        madre: madreBovinos.nombre,
        madreChip: madreBovinos.chip,
      })
      .from(vaquillas)
      .leftJoin(bovinos, eq(vaquillas.bovinoId, bovinos.id))
      .leftJoin(padreBovinos, eq(vaquillas.padreId, padreBovinos.id))
      .leftJoin(madreBovinos, eq(vaquillas.madreId, madreBovinos.id))
      .where(where)
      .orderBy(desc(vaquillas.createdAt))
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

vaquillasRoutes.get("/:id", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);

  const id = c.req.param("id");

  try {
    const [vaquilla] = await db
      .select()
      .from(vaquillas)
      .where(eq(vaquillas.id, id));

    if (!vaquilla) throw new AppError("Vaquilla no encontrada", "NOT_FOUND", 404);

    return c.json({ success: true, data: vaquilla });
  } catch (error) {
    throw error;
  }
});

vaquillasRoutes.post("/", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);
  if (!["admin", "gestor"].includes(user.rol)) throw new AppError("Permiso denegado", "FORBIDDEN", 403);

  try {
    const body = await c.req.json();
    const data = VaquillaCreateSchema.parse(body);

    const [newVaquilla] = await db.insert(vaquillas).values(data).returning();
    logger.info(`Vaquilla registrada: TAT=${newVaquilla.tat}`);

    return c.json({ success: true, data: newVaquilla, message: "Vaquilla registrada exitosamente" }, 201);
  } catch (error) {
    throw error;
  }
});

vaquillasRoutes.put("/:id", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);
  if (!["admin", "gestor"].includes(user.rol)) throw new AppError("Permiso denegado", "FORBIDDEN", 403);

  const id = c.req.param("id");

  try {
    const [existing] = await db.select().from(vaquillas).where(eq(vaquillas.id, id));
    if (!existing) throw new AppError("Vaquilla no encontrada", "NOT_FOUND", 404);

    const body = await c.req.json();
    const data = VaquillaUpdateSchema.parse(body);

    const [updated] = await db
      .update(vaquillas)
      .set(data)
      .where(eq(vaquillas.id, id))
      .returning();

    return c.json({ success: true, data: updated, message: "Vaquilla actualizada exitosamente" });
  } catch (error) {
    throw error;
  }
});

vaquillasRoutes.delete("/:id", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);
  if (user.rol !== "admin") throw new AppError("Solo admin puede eliminar", "FORBIDDEN", 403);

  const id = c.req.param("id");

  try {
    const [existing] = await db.select().from(vaquillas).where(eq(vaquillas.id, id));
    if (!existing) throw new AppError("Vaquilla no encontrada", "NOT_FOUND", 404);

    await db.delete(vaquillas).where(eq(vaquillas.id, id));
    return c.json({ success: true, message: "Vaquilla eliminada exitosamente" });
  } catch (error) {
    throw error;
  }
});

export default vaquillasRoutes;
