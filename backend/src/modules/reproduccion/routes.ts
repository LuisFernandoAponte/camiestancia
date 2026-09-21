import { Hono } from "hono";
import db from "@/db/index.js";
import { pool } from "@/db/index.js";
import { reproduccion, bovinos } from "@/db/schema.js";
import { eq, and, gte, lte, countDistinct, inArray, desc } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getCurrentUser } from "@/lib/jwt.js";
import { ReproduccionCreateSchema, ReproduccionUpdateSchema, PaginationSchema } from "@/lib/schemas.js";
import { AppError } from "@/lib/errors.js";
import logger from "@/utils/logger.js";

const padreBovinos = alias(bovinos, "padre_bovinos");
const toroBovinos = alias(bovinos, "toro_bovinos_rep");

pool.query(`
  ALTER TABLE reproduccion ADD COLUMN IF NOT EXISTS inseminador TEXT;
  ALTER TABLE reproduccion ADD COLUMN IF NOT EXISTS condicion_corporal NUMERIC(3, 1);
  ALTER TABLE reproduccion ADD COLUMN IF NOT EXISTS protocolo TEXT;
  ALTER TABLE reproduccion ADD COLUMN IF NOT EXISTS codigo_pajuela TEXT;
`).catch((err) => logger.error("Error auto-migrando columnas en reproduccion:", err));

async function syncBovinoEstado(hembraId: string, estado: string) {
  if (estado === "confirmada") {
    await db
      .update(bovinos)
      .set({ estado: "preñez", updatedAt: new Date() })
      .where(eq(bovinos.id, hembraId));
    logger.info(`Bovino ${hembraId} actualizado a preñez`);
  } else if (["aborto", "parto_realizado", "descartada"].includes(estado)) {
    await db
      .update(bovinos)
      .set({ estado: "activo", updatedAt: new Date() })
      .where(eq(bovinos.id, hembraId));
    logger.info(`Bovino ${hembraId} actualizado a activo (${estado})`);
  }
}

export const reproduccionRoutes = new Hono();

reproduccionRoutes.get("/", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);

  const { page, limit } = PaginationSchema.parse(c.req.query());
  const estado = c.req.query("estado");
  const hembraId = c.req.query("hembraId");

  const offset = (page - 1) * limit;

  try {
    const conditions: any[] = [];
    if (estado) conditions.push(eq(reproduccion.estado, estado as any));
    if (hembraId) conditions.push(eq(reproduccion.hembraId, hembraId));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ total }] = await db
      .select({ total: countDistinct(reproduccion.id) })
      .from(reproduccion)
      .where(where);

    const data = await db
      .select({
        id: reproduccion.id,
        hembraId: reproduccion.hembraId,
        hembra: bovinos.nombre,
        chipHembra: bovinos.chip,
        numHembra: bovinos.numeroIdentificacion,
        toroId: reproduccion.toroId,
        toro: toroBovinos.nombre,
        chipToro: toroBovinos.chip,
        padreId: reproduccion.padreId,
        padre: padreBovinos.nombre,
        chipPadre: padreBovinos.chip,
        fechaInseminacion: reproduccion.fechaInseminacion,
        cicloNumero: reproduccion.cicloNumero,
        resultado: reproduccion.resultado,
        tipoServicio: reproduccion.tipoServicio,
        diasGestacion: reproduccion.diasGestacion,
        partoEstimado: reproduccion.partoEstimado,
        fechaDiagnostico: reproduccion.fechaDiagnostico,
        estado: reproduccion.estado,
        observaciones: reproduccion.observaciones,
        inseminador: reproduccion.inseminador,
        condicionCorporal: reproduccion.condicionCorporal,
        protocolo: reproduccion.protocolo,
        codigoPajuela: reproduccion.codigoPajuela,
        createdAt: reproduccion.createdAt,
      })
      .from(reproduccion)
      .innerJoin(bovinos, eq(reproduccion.hembraId, bovinos.id))
      .leftJoin(padreBovinos, eq(reproduccion.padreId, padreBovinos.id))
      .leftJoin(toroBovinos, eq(reproduccion.toroId, toroBovinos.id))
      .where(where)
      .orderBy(desc(reproduccion.fechaInseminacion))
      .limit(limit)
      .offset(offset);

    const ahora = Date.now();
    const GESTACION_MAX = 283;

    const dataConCampos = data.map((r) => {
      const terminado = r.estado === "aborto" || r.estado === "parto_realizado" || r.estado === "descartada";
      let diasActuales: number | null = null;
      let diasFaltantes: number | null = null;
      let partoEstimadoCalc: string | null = null;
      let fechaSecado: string | null = null;
      let trimestre: number | null = null;
      let progreso: number | null = null;

      if (!terminado && r.fechaInseminacion) {
        const insDate = new Date(r.fechaInseminacion).getTime();
        if (!isNaN(insDate)) {
          const desdeIns = Math.max(0, Math.floor((ahora - insDate) / (24 * 60 * 60 * 1000)));
          diasActuales = Math.min(GESTACION_MAX, desdeIns);
          diasFaltantes = Math.max(0, GESTACION_MAX - diasActuales);
          progreso = Math.min(100, Math.round((diasActuales / GESTACION_MAX) * 100));
          trimestre = diasActuales <= 90 ? 1 : diasActuales <= 180 ? 2 : 3;

          const partoDate = new Date(insDate + GESTACION_MAX * 24 * 60 * 60 * 1000);
          partoEstimadoCalc = partoDate.toISOString().split("T")[0];

          const secadoDate = new Date(insDate + 210 * 24 * 60 * 60 * 1000);
          fechaSecado = secadoDate.toISOString().split("T")[0];
        }
      }

      return {
        ...r,
        condicionCorporal: r.condicionCorporal ? parseFloat(r.condicionCorporal.toString()) : null,
        diasActuales,
        diasFaltantes,
        partoEstimadoCalc,
        fechaSecado,
        trimestre,
        progreso,
      };
    });

    const totalPages = Math.ceil(total / limit);

    logger.info(`Reproducciones listadas: ${dataConCampos.length}/${total}`);

    return c.json({
      success: true,
      data: dataConCampos,
      meta: { page, limit, total, pages: totalPages },
    });
  } catch (error) {
    throw error;
  }
});

reproduccionRoutes.get("/partos/proximos", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);

  const dias = parseInt(c.req.query("dias") || "30");

  try {
    const hoy = new Date().toISOString();
    const futuro = new Date(Date.now() + dias * 24 * 60 * 60 * 1000).toISOString();

    const data = await db
      .select({
        id: reproduccion.id,
        hembraId: reproduccion.hembraId,
        hembra: bovinos.nombre,
        diasGestacion: reproduccion.diasGestacion,
        partoEstimado: reproduccion.partoEstimado,
        estado: reproduccion.estado,
      })
      .from(reproduccion)
      .innerJoin(bovinos, eq(reproduccion.hembraId, bovinos.id))
      .where(
        and(
          gte(reproduccion.partoEstimado, hoy),
          lte(reproduccion.partoEstimado, futuro),
          eq(reproduccion.estado, "confirmada"),
        ),
      )
      .orderBy(reproduccion.partoEstimado);

    const ahora = Date.now();
    const dataConGestacion = data.map((r) => {
      if (r.partoEstimado) {
        const diasRestantes = Math.ceil((new Date(r.partoEstimado).getTime() - ahora) / (24 * 60 * 60 * 1000));
        return { ...r, diasGestacion: Math.max(0, 283 - diasRestantes) };
      }
      return r;
    });

    logger.info(`Partos próximos: ${data.length} en los próximos ${dias} días`);

    return c.json({
      success: true,
      data: dataConGestacion,
    });
  } catch (error) {
    throw new AppError("Error obteniendo partos próximos", "FETCH_ERROR", 500);
  }
});

reproduccionRoutes.post("/", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);

  if (!["admin", "gestor", "veterinario"].includes(user.rol)) {
    throw new AppError("Permiso denegado", "FORBIDDEN", 403);
  }

  try {
    const body = await c.req.json();
    const data = ReproduccionCreateSchema.parse(body);

    const [hembra] = await db
      .select()
      .from(bovinos)
      .where(eq(bovinos.id, data.hembraId));

    if (!hembra) throw new AppError("Hembra no encontrada", "NOT_FOUND", 404);
    if (hembra.sexo !== "Hembra") throw new AppError("El animal debe ser hembra", "INVALID_DATA", 400);

    const fechaIns = data.fechaInseminacion;
    const fechaInsStr = fechaIns instanceof Date ? fechaIns.toISOString() : String(fechaIns);
    const partoDate = new Date(new Date(fechaInsStr).getTime() + 283 * 24 * 60 * 60 * 1000);
    const partoEstimadoStr = partoDate.toISOString();

    const [newReproduccion] = await db
      .insert(reproduccion)
      .values({
        hembraId: data.hembraId,
        toroId: data.toroId || null,
        padreId: data.padreId || null,
        fechaInseminacion: fechaInsStr,
        cicloNumero: data.cicloNumero,
        resultado: data.resultado,
        tipoServicio: data.tipoServicio,
        partoEstimado: partoEstimadoStr,
        estado: data.estado,
        observaciones: data.observaciones || null,
        inseminador: data.inseminador || null,
        condicionCorporal: data.condicionCorporal ? data.condicionCorporal.toString() : null,
        protocolo: data.protocolo || null,
        codigoPajuela: data.codigoPajuela || null,
      })
      .returning();

    if (newReproduccion.estado === "confirmada") {
      await db
        .update(bovinos)
        .set({ estado: "preñez", updatedAt: new Date() })
        .where(eq(bovinos.id, data.hembraId));
    }

    logger.info(`Inseminación registrada: ${data.hembraId}`);

    return c.json(
      {
        success: true,
        data: newReproduccion,
        message: "Inseminación registrada exitosamente",
      },
      201,
    );
  } catch (error) {
    throw error;
  }
});

reproduccionRoutes.put("/:id", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);

  if (!["admin", "gestor", "veterinario"].includes(user.rol)) {
    throw new AppError("Permiso denegado", "FORBIDDEN", 403);
  }

  const id = c.req.param("id");

  try {
    const [existing] = await db
      .select()
      .from(reproduccion)
      .where(eq(reproduccion.id, id));

    if (!existing) throw new AppError("Inseminación no encontrada", "NOT_FOUND", 404);

    const body = await c.req.json();
    const data = ReproduccionUpdateSchema.parse(body);

    const updatePayload: Record<string, any> = { ...data };
    if (data.condicionCorporal !== undefined) {
      updatePayload.condicionCorporal = data.condicionCorporal !== null ? data.condicionCorporal.toString() : null;
    }

    const [updated] = await db
      .update(reproduccion)
      .set(updatePayload)
      .where(eq(reproduccion.id, id))
      .returning();

    if (data.estado) {
      await syncBovinoEstado(existing.hembraId, data.estado);
    }

    logger.info(`Inseminación actualizada: ${id}`);

    return c.json({
      success: true,
      data: updated,
      message: "Inseminación actualizada exitosamente",
    });
  } catch (error) {
    throw error;
  }
});

reproduccionRoutes.delete("/:id", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);
  if (user.rol !== "admin") throw new AppError("Solo admin puede eliminar", "FORBIDDEN", 403);

  const id = c.req.param("id");

  try {
    const [existing] = await db
      .select()
      .from(reproduccion)
      .where(eq(reproduccion.id, id));

    if (!existing) throw new AppError("Inseminación no encontrada", "NOT_FOUND", 404);

    await db.delete(reproduccion).where(eq(reproduccion.id, id));

    if (existing.estado === "confirmada") {
      await db
        .update(bovinos)
        .set({ estado: "activo", updatedAt: new Date() })
        .where(eq(bovinos.id, existing.hembraId));
    }

    logger.info(`Inseminación eliminada: ${id}`);

    return c.json({
      success: true,
      message: "Inseminación eliminada exitosamente",
    });
  } catch (error) {
    throw error;
  }
});

export default reproduccionRoutes;
