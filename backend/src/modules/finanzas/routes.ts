import { Hono } from "hono";
import db from "@/db/index.js";
import { finanzas, gastos, bovinos } from "@/db/schema.js";
import { eq, and, desc, countDistinct } from "drizzle-orm";
import { getCurrentUser } from "@/lib/jwt.js";
import { FinanzasCreateSchema, FinanzasUpdateSchema, PaginationSchema } from "@/lib/schemas.js";
import { AppError } from "@/lib/errors.js";
import logger from "@/utils/logger.js";

function formatBs(val?: number | null): string {
  const n = typeof val === "number" && !isNaN(val) ? val : 0;
  return `Bs. ${n.toLocaleString("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Rutas de Finanzas
 */
export const finanzasRoutes = new Hono();

/**
 * GET /api/finanzas
 * Obtiene KPIs generales de finanzas
 */
finanzasRoutes.get("/", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);

  try {
    const hoy = new Date();
    const mesActual = hoy.getMonth() + 1;
    const anioActual = hoy.getFullYear();

    // KPIs del mes actual
    const mesData = await db
      .select()
      .from(finanzas)
      .where(
        and(
          eq(finanzas.mes, mesActual),
          eq(finanzas.anio, anioActual),
        ),
      );

    const ingresosMes = mesData.reduce(
      (sum, r) => sum + parseFloat(r.ingresos.toString()),
      0,
    );
    const egresosFinanzas = mesData.reduce(
      (sum, r) => sum + parseFloat(r.egresos.toString()),
      0,
    );

    const gastosMesData = await db
      .select()
      .from(gastos)
      .where(
        and(
          eq(gastos.mes, mesActual),
          eq(gastos.anio, anioActual),
        ),
      );

    const egresosGastos = gastosMesData.reduce(
      (sum, g) => sum + parseFloat(g.monto.toString()),
      0,
    );

    const egresosMes = egresosFinanzas + egresosGastos;
    const margen = ingresosMes - egresosMes;

    // Proyección anual (suma de últimos 12 meses si están disponibles)
    const ultimoAnio = await db
      .select()
      .from(finanzas)
      .where(eq(finanzas.anio, anioActual));

    const ingresosPorMes = new Array(12).fill(0);
    const egresosPorMes = new Array(12).fill(0);

    ultimoAnio.forEach((record) => {
      ingresosPorMes[record.mes - 1] += parseFloat(record.ingresos.toString());
      egresosPorMes[record.mes - 1] += parseFloat(record.egresos.toString());
    });

    // Add gastos to the monthly projection
    const gastosAnioData = await db
      .select()
      .from(gastos)
      .where(eq(gastos.anio, anioActual));

    gastosAnioData.forEach((g) => {
      egresosPorMes[g.mes - 1] += parseFloat(g.monto.toString());
    });

    const ingresosTotales = ingresosPorMes.reduce((a, b) => a + b);
    const egresosTotales = egresosPorMes.reduce((a, b) => a + b);
    const proyeccionAnual = (ingresosTotales / mesActual) * 12;

    logger.info(`KPIs financieros consultados`);

    return c.json({
      success: true,
      data: {
        ingresosMes,
        egresosMes,
        margenNeto: margen,
        proyeccionAnual: Math.round(proyeccionAnual),
        mesActual,
        anioActual,
      },
    });
  } catch (error) {
    logger.error("Error obteniendo KPIs:", error);
    throw new AppError("Error obteniendo KPIs", "FETCH_ERROR", 500);
  }
});

/**
 * GET /api/finanzas/lotes
 * Obtiene desglose por lote con histórico
 */
finanzasRoutes.get("/lotes", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);

  try {
    const lotes = new Set<string>();
    const allData = await db.select().from(finanzas).orderBy(desc(finanzas.anio), desc(finanzas.mes));

    allData.forEach((r) => lotes.add(r.lote));

    const result = Array.from(lotes).map((lote) => {
      const lotesData = allData.filter((r) => r.lote === lote);
      const ingresosTotales = lotesData.reduce(
        (sum, r) => sum + parseFloat(r.ingresos.toString()),
        0,
      );
      const egresosTotales = lotesData.reduce(
        (sum, r) => sum + parseFloat(r.egresos.toString()),
        0,
      );

      return {
        lote,
        ingresos: ingresosTotales,
        egresos: egresosTotales,
        margen: ingresosTotales - egresosTotales,
        registros: lotesData.length,
      };
    });

    logger.info(`Desglose por lote obtenido: ${result.length} lotes`);

    return c.json({
      success: true,
      data: result,
    });
  } catch (error) {
    throw new AppError("Error obteniendo desglose por lote", "FETCH_ERROR", 500);
  }
});

/**
 * GET /api/finanzas/historico
 * Obtiene histórico mensual para gráficos
 */
finanzasRoutes.get("/historico", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);

  const meses = parseInt(c.req.query("meses") || "6");

  try {
    const hoy = new Date();
    const desde = new Date(hoy);
    desde.setMonth(desde.getMonth() - meses);

    const data = await db
      .select()
      .from(finanzas)
      .where(
        and(
          eq(finanzas.anio, desde.getFullYear()),
        ),
      )
      .orderBy(finanzas.mes);

    // Agrupar por mes
    const porMes: Record<string, { ingresos: number; egresos: number }> = {};

    data.forEach((record) => {
      const key = `${record.anio}-${String(record.mes).padStart(2, "0")}`;
      if (!porMes[key]) {
        porMes[key] = { ingresos: 0, egresos: 0 };
      }
      porMes[key].ingresos += parseFloat(record.ingresos.toString());
      porMes[key].egresos += parseFloat(record.egresos.toString());
    });

    const serie = Object.entries(porMes).map(([mes, { ingresos, egresos }]) => ({
      mes,
      ingresos,
      egresos,
    }));

    logger.info(`Histórico de ${meses} meses obtenido`);

    return c.json({
      success: true,
      data: serie,
    });
  } catch (error) {
    throw new AppError("Error obteniendo histórico", "FETCH_ERROR", 500);
  }
});

/**
 * GET /api/finanzas/registros
 * Obtiene lista de registros financieros individuales con paginación
 */
finanzasRoutes.get("/registros", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);

  const { page, limit } = PaginationSchema.parse(c.req.query());
  const offset = (page - 1) * limit;

  try {
    const [{ total }] = await db
      .select({ total: countDistinct(finanzas.id) })
      .from(finanzas);

    const data = await db
      .select()
      .from(finanzas)
      .orderBy(desc(finanzas.createdAt))
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
        ingresos: parseFloat(r.ingresos.toString()),
        egresos: parseFloat(r.egresos.toString()),
        createdAt: r.createdAt,
      })),
      meta: { page, limit, total, pages: totalPages },
    });
  } catch (error) {
    throw new AppError("Error listando registros financieros", "FETCH_ERROR", 500);
  }
});

/**
 * POST /api/finanzas
 * Crea un registro financiero
 */
finanzasRoutes.post("/", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);

  if (!["admin", "gestor"].includes(user.rol)) {
    throw new AppError("Permiso denegado", "FORBIDDEN", 403);
  }

  try {
    const body = await c.req.json();
    const data = FinanzasCreateSchema.parse(body);

    // Verificar que no exista registro duplicado (lote+mes+año)
    const [existing] = await db
      .select()
      .from(finanzas)
      .where(
        and(
          eq(finanzas.lote, data.lote),
          eq(finanzas.mes, data.mes),
          eq(finanzas.anio, data.anio),
        ),
      );

    if (existing) {
      throw new AppError(
        `Ya existe registro para ${data.lote} en mes ${data.mes}/${data.anio}`,
        "DUPLICATE_RECORD",
        400,
      );
    }

    const [newRecord] = await db
      .insert(finanzas)
      .values({
        ...data,
        ingresos: data.ingresos.toString(),
        egresos: data.egresos.toString(),
      })
      .returning();

    logger.info(`Registro financiero creado: ${data.lote} ${data.mes}/${data.anio}`);

    return c.json(
      {
        success: true,
        data: newRecord,
        message: "Registro creado exitosamente",
      },
      201,
    );
  } catch (error) {
    throw error;
  }
});

/**
 * PUT /api/finanzas/:id
 * Actualiza un registro financiero
 */
finanzasRoutes.put("/:id", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);

  if (!["admin", "gestor"].includes(user.rol)) {
    throw new AppError("Permiso denegado", "FORBIDDEN", 403);
  }

  const id = c.req.param("id");

  try {
    const [existing] = await db
      .select()
      .from(finanzas)
      .where(eq(finanzas.id, id));

    if (!existing) {
      throw new AppError("Registro no encontrado", "NOT_FOUND", 404);
    }

    const body = await c.req.json();
    const data = FinanzasUpdateSchema.parse(body);

    const [updated] = await db
      .update(finanzas)
      .set({
        ...data,
        ingresos: data.ingresos?.toString(),
        egresos: data.egresos?.toString(),
      })
      .where(eq(finanzas.id, id))
      .returning();

    logger.info(`Registro financiero actualizado: ${id}`);

    return c.json({
      success: true,
      data: updated,
      message: "Registro actualizado exitosamente",
    });
  } catch (error) {
    throw error;
  }
});

/**
 * DELETE /api/finanzas/:id
 * Elimina un registro (solo admin)
 */
finanzasRoutes.delete("/:id", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);

  if (user.rol !== "admin") {
    throw new AppError("Solo admin puede eliminar", "FORBIDDEN", 403);
  }

  const id = c.req.param("id");

  try {
    const [existing] = await db
      .select()
      .from(finanzas)
      .where(eq(finanzas.id, id));

    if (!existing) {
      throw new AppError("Registro no encontrado", "NOT_FOUND", 404);
    }

    await db.delete(finanzas).where(eq(finanzas.id, id));

    logger.info(`Registro financiero eliminado: ${id}`);

    return c.json({
      success: true,
      message: "Registro eliminado exitosamente",
    });
  } catch (error) {
    throw error;
  }
});

/**
 * GET /api/finanzas/resumen
 * Dashboard financiero completo: KPIs, gastos por categoría, últimos registros e insights
 */
finanzasRoutes.get("/resumen", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);

  const mes = parseInt(c.req.query("mes") || String(new Date().getMonth() + 1));
  const anio = parseInt(c.req.query("anio") || String(new Date().getFullYear()));

  try {
    const mesData = await db
      .select()
      .from(finanzas)
      .where(and(eq(finanzas.mes, mes), eq(finanzas.anio, anio)));

    const ingresos = mesData.reduce((s, r) => s + parseFloat(String(r.ingresos)), 0);
    const egresosPlan = mesData.reduce((s, r) => s + parseFloat(String(r.egresos)), 0);

    const gastosRaw = await db
      .select()
      .from(gastos)
      .where(and(eq(gastos.mes, mes), eq(gastos.anio, anio)));

    const gastosTotal = gastosRaw.reduce((s, g) => s + parseFloat(String(g.monto)), 0);
    const egresos = egresosPlan + gastosTotal;
    const margen = ingresos - egresos;

    const porCategoriaMap: Record<string, number> = {};
    for (const g of gastosRaw) {
      const monto = parseFloat(String(g.monto));
      porCategoriaMap[g.categoria] = (porCategoriaMap[g.categoria] || 0) + monto;
    }
    const porCategoria = Object.entries(porCategoriaMap)
      .map(([categoria, total]) => ({ categoria, total }))
      .sort((a, b) => b.total - a.total);

    const ingresosRaw = mesData.filter((r) => parseFloat(String(r.ingresos)) > 0);

    const ingresosFormatted = ingresosRaw.map((r) => ({
      categoria: "ingreso",
      descripcion: r.lote,
      monto: parseFloat(String(r.ingresos)),
      lote: r.lote,
      createdAt: r.createdAt,
      tipo: "ingreso" as const,
    }));

    const gastosFormatted = gastosRaw.map((g) => ({
      categoria: g.categoria,
      descripcion: g.descripcion,
      monto: parseFloat(String(g.monto)),
      lote: g.lote,
      createdAt: g.createdAt,
      tipo: "gasto" as const,
    }));

    const ultimosRegistros = [...ingresosFormatted, ...gastosFormatted]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    const mesAnterior = mes === 1 ? 12 : mes - 1;
    const anioAnterior = mes === 1 ? anio - 1 : anio;

    const prevFinanzas = await db
      .select()
      .from(finanzas)
      .where(and(eq(finanzas.mes, mesAnterior), eq(finanzas.anio, anioAnterior)));

    const prevGastos = await db
      .select()
      .from(gastos)
      .where(and(eq(gastos.mes, mesAnterior), eq(gastos.anio, anioAnterior)));

    const ingresosAnterior = prevFinanzas.reduce((s, r) => s + parseFloat(String(r.ingresos)), 0);
    const egresosAnterior = prevFinanzas.reduce((s, r) => s + parseFloat(String(r.egresos)), 0)
      + prevGastos.reduce((s, g) => s + parseFloat(String(g.monto)), 0);
    const margenAnterior = ingresosAnterior - egresosAnterior;

    const trend: { categoria: string; trend: string }[] = [];

    // Tendencia de egresos vs mes anterior
    if (egresosAnterior > 0) {
      const diff = ((egresos - egresosAnterior) / egresosAnterior) * 100;
      if (diff > 10) trend.push({ categoria: "Gastos totales", trend: `⚠️ Gastos ↑ ${diff.toFixed(0)}% vs mes anterior` });
      else if (diff < -10) trend.push({ categoria: "Gastos totales", trend: `✅ Gastos ↓ ${Math.abs(diff).toFixed(0)}% vs mes anterior` });
      else trend.push({ categoria: "Gastos totales", trend: "➡️ Gastos estables vs mes anterior" });
    } else if (gastosTotal > 0) {
      trend.push({ categoria: "Primer mes con gastos", trend: "📊 Registro inicial" });
    }

    // Margen vs mes anterior
    if (margen !== 0 && margenAnterior !== 0) {
      const mejora = margen - margenAnterior;
      if (mejora > 0) trend.push({ categoria: "Margen", trend: `✅ Margen +${formatBs(mejora)} vs mes anterior` });
      else if (mejora < 0) trend.push({ categoria: "Margen", trend: `⚠️ Margen ${formatBs(mejora)} vs mes anterior` });
      else trend.push({ categoria: "Margen", trend: "➡️ Margen sin cambios" });
    }

    // Categoría de gasto más alta
    if (porCategoria.length > 0) {
      const top = porCategoria[0];
      const pct = ((top.total / gastosTotal) * 100).toFixed(0);
      trend.push({ categoria: top.categoria, trend: `🏷️ Mayor gasto: ${formatBs(top.total)} (${pct}% del total)` });
    }

    // Recomendación si hay margen negativo
    if (margen < 0) {
      trend.push({ categoria: "Alerta", trend: "🔴 Gastos superan ingresos — revisar categorías principales" });
    } else if (ingresos === 0 && gastosTotal > 0) {
      trend.push({ categoria: "Sin ingresos", trend: "💡 No hay ingresos registrados para este mes" });
    }

    // Total de bovinos activos para cálculo de costo por cabeza
    const [{ totalBovinos }] = await db
      .select({ totalBovinos: countDistinct(bovinos.id) })
      .from(bovinos)
      .where(eq(bovinos.descartado, false));

    const bovinosCount = Number(totalBovinos) || 0;
    const costoPorCabeza = bovinosCount > 0 ? egresos / bovinosCount : 0;
    const utilidadPorcentaje = ingresos > 0 ? (margen / ingresos) * 100 : 0;

    // Desglose Contable P&L
    const gastosDirectos = (porCategoriaMap["remedios"] || 0) + (porCategoriaMap["alimento"] || 0) + (porCategoriaMap["biologicos"] || 0);
    const gastosEstructura = egresos - gastosDirectos;

    if (bovinosCount > 0) {
      trend.push({
        categoria: "Costo por Cabeza",
        trend: `🐮 Costo operativo: ${formatBs(costoPorCabeza)} / animal (${bovinosCount} cabezas)`,
      });
    }

    logger.info(`Resumen financiero obtenido para ${mes}/${anio}`);

    return c.json({
      success: true,
      data: {
        resumen: {
          ingresos,
          egresos,
          margen,
          total_registros: gastosRaw.length + mesData.length,
          costoPorCabeza,
          utilidadPorcentaje,
          totalBovinos: bovinosCount,
          gastosDirectos,
          gastosEstructura,
        },
        porCategoria,
        ultimosRegistros,
        insights: trend,
        moneda: "Bs.",
        mes,
        anio,
      },
    });
  } catch (error) {
    logger.error("Error en resumen financiero:", error);
    throw new AppError("Error al cargar resumen financiero", "FETCH_ERROR", 500);
  }
});

export default finanzasRoutes;
