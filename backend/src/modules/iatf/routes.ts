import { Hono } from "hono";
import db from "@/db/index.js";
import { reproduccion, bovinos, diagnosticos, toros } from "@/db/schema.js";
import { eq, and, or, gte, lte, count, desc, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { getCurrentUser } from "@/lib/jwt.js";
import { ReproduccionCreateSchema, ReproduccionUpdateSchema, PaginationSchema } from "@/lib/schemas.js";
import { AppError } from "@/lib/errors.js";
import logger from "@/utils/logger.js";

const hembraBovinos = alias(bovinos, "hembra_bovinos");
const toroBovinos = alias(bovinos, "toro_bovinos_iatf");
const padreBovinosIatf = alias(bovinos, "padre_bovinos_iatf");

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

export const iatfRoutes = new Hono();

iatfRoutes.get("/", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);
  return c.redirect("/api/iatf/ciclos");
});

iatfRoutes.get("/ciclos", async (c) => {

  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);

  try {
    const { page, limit } = PaginationSchema.parse(c.req.query());
    const offset = (page - 1) * limit;
    const ciclo = c.req.query("ciclo");
    const resultado = c.req.query("resultado");
    const hembraId = c.req.query("hembraId");

    const conditions: any[] = [eq(reproduccion.tipoServicio, "iatf")];
    if (ciclo) conditions.push(eq(reproduccion.cicloNumero, parseInt(ciclo)));
    if (resultado) conditions.push(eq(reproduccion.resultado, resultado as any));
    if (hembraId) conditions.push(eq(reproduccion.hembraId, hembraId));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [{ total }] = await db
      .select({ total: count() })
      .from(reproduccion)
      .where(where);

    const data = await db
      .select({
        id: reproduccion.id,
        hembraId: reproduccion.hembraId,
        hembra: hembraBovinos.nombre,
        chipHembra: hembraBovinos.chip,
        numHembra: hembraBovinos.numeroIdentificacion,
        toroId: reproduccion.toroId,
        toro: toroBovinos.nombre,
        chipToro: toroBovinos.chip,
        padreId: reproduccion.padreId,
        fechaInseminacion: reproduccion.fechaInseminacion,
        cicloNumero: reproduccion.cicloNumero,
        resultado: reproduccion.resultado,
        tipoServicio: reproduccion.tipoServicio,
        diasGestacion: reproduccion.diasGestacion,
        partoEstimado: reproduccion.partoEstimado,
        fechaDiagnostico: reproduccion.fechaDiagnostico,
        estado: reproduccion.estado,
        observaciones: reproduccion.observaciones,
        createdAt: reproduccion.createdAt,
      })
      .from(reproduccion)
      .innerJoin(hembraBovinos, eq(reproduccion.hembraId, hembraBovinos.id))
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
      let partoEstimadoCalc: string | null = null;
      let progreso: number | null = null;

      if (!terminado && r.fechaInseminacion) {
        const insDate = new Date(r.fechaInseminacion).getTime();
        if (!isNaN(insDate)) {
          const desdeIns = Math.max(0, Math.floor((ahora - insDate) / (24 * 60 * 60 * 1000)));
          diasActuales = Math.min(GESTACION_MAX, desdeIns);
          progreso = Math.min(100, Math.round((diasActuales / GESTACION_MAX) * 100));
          const partoDate = new Date(insDate + GESTACION_MAX * 24 * 60 * 60 * 1000);
          partoEstimadoCalc = partoDate.toISOString().split("T")[0];
        }
      }
      return { ...r, diasActuales, partoEstimadoCalc, progreso };
    });

    const totalPages = Math.ceil(total / limit);

    return c.json({
      success: true,
      data: dataConCampos,
      meta: { page, limit, total, pages: totalPages },
    });
  } catch (error) {
    throw error;
  }
});

iatfRoutes.get("/tasas", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);

  try {
    const ciclo = c.req.query("ciclo");
    const conditions = [eq(reproduccion.tipoServicio, "iatf")];
    if (ciclo) conditions.push(eq(reproduccion.cicloNumero, parseInt(ciclo)));

    const where = and(...conditions);

    const totales = await db
      .select({
        ciclo: reproduccion.cicloNumero,
        total: count(),
        positivos: sql`COUNT(*) FILTER (WHERE ${reproduccion.resultado} = 'positivo')`.mapWith(Number),
        negativos: sql`COUNT(*) FILTER (WHERE ${reproduccion.resultado} = 'negativo')`.mapWith(Number),
        pendientes: sql`COUNT(*) FILTER (WHERE ${reproduccion.resultado} = 'pendiente')`.mapWith(Number),
      })
      .from(reproduccion)
      .where(where)
      .groupBy(reproduccion.cicloNumero)
      .orderBy(reproduccion.cicloNumero);

    const tasas = totales.map((t) => ({
      ciclo: t.ciclo,
      total: t.total,
      positivos: t.positivos,
      negativos: t.negativos,
      pendientes: t.pendientes,
      tasaPreñez: t.total > 0 ? Math.round((t.positivos / t.total) * 100) : 0,
    }));

    const general = tasas.reduce(
      (acc, t) => ({
        total: acc.total + t.total,
        positivos: acc.positivos + t.positivos,
        negativos: acc.negativos + t.negativos,
      }),
      { total: 0, positivos: 0, negativos: 0 },
    );

    return c.json({
      success: true,
      data: {
        porCiclo: tasas,
        general: {
          ...general,
          tasaPreñez: general.total > 0 ? Math.round((general.positivos / general.total) * 100) : 0,
        },
      },
    });
  } catch (error) {
    throw error;
  }
});

iatfRoutes.get("/tasas-por-toro", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);

  try {
    const data = await db
      .select({
        toroId: sql`COALESCE(${reproduccion.toroId}, ${reproduccion.padreId})`.mapWith(String),
        toro: sql`COALESCE(${toroBovinos.nombre}, ${padreBovinosIatf.nombre})`.mapWith(String),
        chipToro: sql`COALESCE(${toroBovinos.chip}, ${padreBovinosIatf.chip})`.mapWith(String),
        total: count(),
        positivos: sql`COUNT(*) FILTER (WHERE ${reproduccion.resultado} = 'positivo')`.mapWith(Number),
        negativos: sql`COUNT(*) FILTER (WHERE ${reproduccion.resultado} = 'negativo')`.mapWith(Number),
      })
      .from(reproduccion)
      .leftJoin(toroBovinos, eq(reproduccion.toroId, toroBovinos.id))
      .leftJoin(padreBovinosIatf, eq(reproduccion.padreId, padreBovinosIatf.id))
      .where(
        and(
          eq(reproduccion.tipoServicio, "iatf"),
          or(
            eq(reproduccion.resultado, "positivo"),
            eq(reproduccion.resultado, "negativo"),
          ),
        ),
      )
      .groupBy(
        sql`COALESCE(${reproduccion.toroId}, ${reproduccion.padreId})`,
        sql`COALESCE(${toroBovinos.nombre}, ${padreBovinosIatf.nombre})`,
        sql`COALESCE(${toroBovinos.chip}, ${padreBovinosIatf.chip})`,
      )
      .orderBy(desc(sql`COUNT(*)`));

    const result = data.map((d) => ({
      ...d,
      tasaPreñez: d.total > 0 ? Math.round((d.positivos / d.total) * 100) : 0,
    }));

    return c.json({ success: true, data: result });
  } catch (error) {
    throw error;
  }
});

iatfRoutes.get("/vacas-para-ciclo", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);

  try {
    const proxCiclo = parseInt(c.req.query("proximo_ciclo") || "1");

    const vacasRepetidoras = await db
      .select({
        id: bovinos.id,
        chip: bovinos.chip,
        nombre: bovinos.nombre,
        numeroIdentificacion: bovinos.numeroIdentificacion,
        raza: bovinos.raza,
        ultimoCiclo: sql`MAX(${reproduccion.cicloNumero})`.mapWith(Number),
        totalIatf: sql`COUNT(*)`.mapWith(Number),
        ultimoResultado: sql`(SELECT ${reproduccion.resultado} FROM ${reproduccion} WHERE ${reproduccion.hembraId} = ${bovinos.id} AND ${reproduccion.tipoServicio} = 'iatf' ORDER BY ${reproduccion.fechaInseminacion} DESC LIMIT 1)`.mapWith(String),
        ultimaFecha: sql`MAX(${reproduccion.fechaInseminacion})`.mapWith(String),
      })
      .from(bovinos)
      .innerJoin(reproduccion, eq(bovinos.id, reproduccion.hembraId))
      .where(
        and(
          eq(bovinos.sexo, "Hembra"),
          eq(bovinos.estado, "activo"),
          eq(bovinos.descartado, false),
          eq(reproduccion.tipoServicio, "iatf"),
        ),
      )
      .groupBy(bovinos.id)
      .having(sql`MAX(${reproduccion.cicloNumero}) < ${proxCiclo}`);

    return c.json({ success: true, data: vacasRepetidoras });
  } catch (error) {
    throw error;
  }
});

iatfRoutes.get("/historial-hembra/:hembraId", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);

  const { hembraId } = c.req.param();

  try {
    const registros = await db
      .select({
        id: reproduccion.id,
        fechaInseminacion: reproduccion.fechaInseminacion,
        cicloNumero: reproduccion.cicloNumero,
        resultado: reproduccion.resultado,
        toroId: reproduccion.toroId,
        toro: toroBovinos.nombre,
        estado: reproduccion.estado,
        fechaDiagnostico: reproduccion.fechaDiagnostico,
        observaciones: reproduccion.observaciones,
      })
      .from(reproduccion)
      .leftJoin(toroBovinos, eq(reproduccion.toroId, toroBovinos.id))
      .where(eq(reproduccion.hembraId, hembraId))
      .orderBy(desc(reproduccion.cicloNumero));

    const hembra = await db
      .select()
      .from(bovinos)
      .where(eq(bovinos.id, hembraId))
      .then((r) => r[0]);

    return c.json({
      success: true,
      data: {
        hembra,
        iatfs: registros,
        totalIatf: registros.length,
        ultimoResultado: registros[0]?.resultado || null,
        ultimoCiclo: registros[0]?.cicloNumero || 0,
      },
    });
  } catch (error) {
    throw error;
  }
});

export default iatfRoutes;
