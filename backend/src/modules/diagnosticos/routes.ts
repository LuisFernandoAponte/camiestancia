import { Hono } from "hono";
import db from "@/db/index.js";
import { diagnosticos, bovinos, reproduccion } from "@/db/schema.js";
import { eq, and, count, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/jwt.js";
import { DiagnosticoCreateSchema, DiagnosticoUpdateSchema, PaginationSchema } from "@/lib/schemas.js";
import { AppError } from "@/lib/errors.js";
import logger from "@/utils/logger.js";

export const diagnosticosRoutes = new Hono();

diagnosticosRoutes.get("/", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);

  try {
    const { page, limit } = PaginationSchema.parse(c.req.query());
    const offset = (page - 1) * limit;
    const animalId = c.req.query("animalId");
    const resultado = c.req.query("resultado");

    const conditions: any[] = [];
    if (animalId) conditions.push(eq(diagnosticos.animalId, animalId));
    if (resultado) conditions.push(eq(diagnosticos.resultado, resultado as any));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ total }] = await db
      .select({ total: count() })
      .from(diagnosticos)
      .where(where);

    const data = await db
      .select({
        id: diagnosticos.id,
        animalId: diagnosticos.animalId,
        animal: bovinos.nombre,
        chipAnimal: bovinos.chip,
        reproduccionId: diagnosticos.reproduccionId,
        fechaDiagnostico: diagnosticos.fechaDiagnostico,
        tipoDiagnostico: diagnosticos.tipoDiagnostico,
        resultado: diagnosticos.resultado,
        edadGestacionalDias: diagnosticos.edadGestacionalDias,
        observaciones: diagnosticos.observaciones,
        createdAt: diagnosticos.createdAt,
      })
      .from(diagnosticos)
      .leftJoin(bovinos, eq(diagnosticos.animalId, bovinos.id))
      .where(where)
      .orderBy(desc(diagnosticos.fechaDiagnostico))
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

diagnosticosRoutes.post("/", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);
  if (!["admin", "gestor", "veterinario"].includes(user.rol)) throw new AppError("Permiso denegado", "FORBIDDEN", 403);

  try {
    const body = await c.req.json();
    const data = DiagnosticoCreateSchema.parse(body);

    const [newDiag] = await db.insert(diagnosticos).values(data).returning();

    if (data.reproduccionId) {
      const resultado = data.resultado;
      if (resultado === "preñada") {
        await db
          .update(reproduccion)
          .set({
            resultado: "positivo",
            fechaDiagnostico: data.fechaDiagnostico instanceof Date ? data.fechaDiagnostico.toISOString() : String(data.fechaDiagnostico),
            diasGestacion: data.edadGestacionalDias || null,
            estado: "confirmada",
          })
          .where(eq(reproduccion.id, data.reproduccionId));
      } else if (resultado === "vacia") {
        await db
          .update(reproduccion)
          .set({
            resultado: "negativo",
            fechaDiagnostico: data.fechaDiagnostico instanceof Date ? data.fechaDiagnostico.toISOString() : String(data.fechaDiagnostico),
            estado: "descartada",
          })
          .where(eq(reproduccion.id, data.reproduccionId));
      }
    }

    logger.info(`Diagnóstico registrado: ${data.tipoDiagnostico} → ${data.resultado}`);
    return c.json({ success: true, data: newDiag, message: "Diagnóstico registrado exitosamente" }, 201);
  } catch (error) {
    throw error;
  }
});

diagnosticosRoutes.put("/:id", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);
  if (!["admin", "gestor", "veterinario"].includes(user.rol)) throw new AppError("Permiso denegado", "FORBIDDEN", 403);

  const id = c.req.param("id");

  try {
    const [existing] = await db.select().from(diagnosticos).where(eq(diagnosticos.id, id));
    if (!existing) throw new AppError("Diagnóstico no encontrado", "NOT_FOUND", 404);

    const body = await c.req.json();
    const data = DiagnosticoUpdateSchema.parse(body);

    const [updated] = await db
      .update(diagnosticos)
      .set(data)
      .where(eq(diagnosticos.id, id))
      .returning();

    return c.json({ success: true, data: updated, message: "Diagnóstico actualizado exitosamente" });
  } catch (error) {
    throw error;
  }
});

diagnosticosRoutes.delete("/:id", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);
  if (user.rol !== "admin") throw new AppError("Solo admin puede eliminar", "FORBIDDEN", 403);

  const id = c.req.param("id");

  try {
    const [existing] = await db.select().from(diagnosticos).where(eq(diagnosticos.id, id));
    if (!existing) throw new AppError("Diagnóstico no encontrado", "NOT_FOUND", 404);

    await db.delete(diagnosticos).where(eq(diagnosticos.id, id));
    return c.json({ success: true, message: "Diagnóstico eliminado exitosamente" });
  } catch (error) {
    throw error;
  }
});

export default diagnosticosRoutes;
