import { Hono } from "hono";
import { pool } from "@/db/index.js";
import { getCurrentUser } from "@/lib/jwt.js";
import { AppError } from "@/lib/errors.js";
import logger from "@/utils/logger.js";

export const dashboardRoutes = new Hono();

/**
 * GET /api/dashboard/kpis
 * KPIs principales del dashboard con datos reales de todas las tablas
 */
dashboardRoutes.get("/kpis", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);

  try {
    const [{ activas }] = await pool.query(`
      SELECT COUNT(*)::int AS activas FROM bovinos
      WHERE estado IN ('activo','disponible','preñez')
    `).then(r => r.rows);

    const [{ disponibles }] = await pool.query(`
      SELECT COUNT(*)::int AS disponibles FROM bovinos WHERE estado = 'disponible'
    `).then(r => r.rows);

    const [{ vendidos }] = await pool.query(`
      SELECT COUNT(*)::int AS vendidos FROM bovinos WHERE estado = 'vendido'
    `).then(r => r.rows);

    const [{ fallecidos }] = await pool.query(`
      SELECT COUNT(*)::int AS fallecidos FROM bovinos WHERE estado = 'fallecido'
    `).then(r => r.rows);

    const [{ hembras }] = await pool.query(`
      SELECT COUNT(*)::int AS hembras FROM bovinos WHERE LOWER(sexo) = 'hembra'
    `).then(r => r.rows);

    const [{ machos }] = await pool.query(`
      SELECT COUNT(*)::int AS machos FROM bovinos WHERE LOWER(sexo) = 'macho'
    `).then(r => r.rows);

    const [{ total: totalBov }] = await pool.query(`
      SELECT COUNT(*)::int AS total FROM bovinos
    `).then(r => r.rows);

    // Reproducción
    const [{ preñadas }] = await pool.query(`
      SELECT COUNT(DISTINCT r.hembra_id)::int AS preñadas
      FROM reproduccion r
      WHERE r.estado IN ('confirmada','evaluacion')
    `).then(r => r.rows);

    const [{ activas: inseminacionesActivas }] = await pool.query(`
      SELECT COUNT(*)::int AS activas FROM reproduccion
      WHERE estado IN ('confirmada','evaluacion')
    `).then(r => r.rows);

    const [{ partos: partosProximos }] = await pool.query(`
      SELECT COUNT(*)::int AS partos FROM reproduccion
      WHERE estado IN ('confirmada','evaluacion')
      AND parto_estimado BETWEEN CURRENT_DATE AND CURRENT_DATE + 30
    `).then(r => r.rows);

    // IATF
    const [{ iatfTotal }] = await pool.query(`
      SELECT COUNT(*)::int AS "iatfTotal" FROM reproduccion WHERE tipo_servicio = 'iatf'
    `).then(r => r.rows);

    const [{ iatfPositivos }] = await pool.query(`
      SELECT COUNT(*)::int AS "iatfPositivos" FROM reproduccion
      WHERE tipo_servicio = 'iatf' AND resultado = 'positivo'
    `).then(r => r.rows);

    const [{ iatfNegativos }] = await pool.query(`
      SELECT COUNT(*)::int AS "iatfNegativos" FROM reproduccion
      WHERE tipo_servicio = 'iatf' AND resultado = 'negativo'
    `).then(r => r.rows);

    const [{ vacasLimite }] = await pool.query(`
      SELECT COUNT(*)::int AS "vacasLimite" FROM (
        SELECT hembra_id, COUNT(*) AS total
        FROM reproduccion
        WHERE tipo_servicio = 'iatf' AND resultado = 'negativo'
        GROUP BY hembra_id
        HAVING COUNT(*) >= 3
      ) sub
    `).then(r => r.rows);

    const [{ torosActivos }] = await pool.query(`
      SELECT COUNT(*)::int AS "torosActivos" FROM toros WHERE activo = true AND descartado = false
    `).then(r => r.rows);

    const [{ torosDescartados }] = await pool.query(`
      SELECT COUNT(*)::int AS "torosDescartados" FROM toros WHERE descartado = true
    `).then(r => r.rows);

    // Salud
    const [{ pendientes }] = await pool.query(`
      SELECT COUNT(*)::int AS pendientes FROM salud
      WHERE estado = 'pendiente'
    `).then(r => r.rows);

    const [{ proximas: prox7d }] = await pool.query(`
      SELECT COUNT(*)::int AS proximas FROM salud
      WHERE estado = 'pendiente'
      AND proxima_fecha IS NOT NULL
      AND proxima_fecha <= CURRENT_DATE + 7
    `).then(r => r.rows);

    // Finanzas del mes actual
    const { total: ingresosMes } = await pool.query(`
      SELECT COALESCE(SUM(ingresos::numeric), 0)::float AS total
      FROM finanzas
      WHERE mes = EXTRACT(MONTH FROM CURRENT_DATE)::int
      AND anio = EXTRACT(YEAR FROM CURRENT_DATE)::int
    `).then(r => r.rows[0]);

    const { total: egresosFinanzas } = await pool.query(`
      SELECT COALESCE(SUM(egresos::numeric), 0)::float AS total
      FROM finanzas
      WHERE mes = EXTRACT(MONTH FROM CURRENT_DATE)::int
      AND anio = EXTRACT(YEAR FROM CURRENT_DATE)::int
    `).then(r => r.rows[0]);

    const { total: egresosGastos } = await pool.query(`
      SELECT COALESCE(SUM(monto::numeric), 0)::float AS total
      FROM gastos
      WHERE mes = EXTRACT(MONTH FROM CURRENT_DATE)::int
      AND anio = EXTRACT(YEAR FROM CURRENT_DATE)::int
    `).then(r => r.rows[0]);

    const totalEgresos = (egresosFinanzas || 0) + (egresosGastos || 0);
    const margenMes = (ingresosMes || 0) - totalEgresos;
    const tasaPreñez = hembras > 0 ? Math.round((preñadas / hembras) * 100) : 0;
    const pctDisponibles = totalBov > 0 ? Math.round((disponibles / totalBov) * 100) : 0;

    logger.info("Dashboard KPIs consultados exitosamente");

    return c.json({
      success: true,
      data: {
        bovinos: {
          total: totalBov || 0,
          activas: activas || 0,
          disponibles: disponibles || 0,
          vendidos: vendidos || 0,
          fallecidos: fallecidos || 0,
          hembras: hembras || 0,
          machos: machos || 0,
          preñadas: preñadas || 0,
          tasaPreñez,
          pctDisponibles,
        },
        salud: {
          pendientes: pendientes || 0,
          proximas7d: prox7d || 0,
        },
        reproduccion: {
          inseminacionesActivas: inseminacionesActivas || 0,
          partosProximos: partosProximos || 0,
        },
        iatf: {
          total: iatfTotal || 0,
          positivos: iatfPositivos || 0,
          negativos: iatfNegativos || 0,
          tasaPreñezIatf: (iatfTotal || 0) > 0 ? Math.round(((iatfPositivos || 0) / (iatfTotal || 0)) * 100) : 0,
          vacasEnLimite: vacasLimite || 0,
          torosActivos: torosActivos || 0,
          torosDescartados: torosDescartados || 0,
        },
        finanzas: {
          ingresosMes: ingresosMes || 0,
          egresosMes: totalEgresos,
          margenMes,
        },
      },
    });
  } catch (error) {
    logger.error("Error en KPIs:", error);
    throw new AppError("Error obteniendo KPIs", "FETCH_ERROR", 500);
  }
});

/**
 * GET /api/dashboard/graficos
 * Serie financiera mensual (últimos 6 meses) + por lote
 */
dashboardRoutes.get("/graficos", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);

  try {
    const monthNames = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

    const finanzasData = await pool.query(`
      SELECT mes, anio, COALESCE(SUM(ingresos::numeric), 0) AS ingresos,
             COALESCE(SUM(egresos::numeric), 0) AS egresos
      FROM finanzas
      WHERE (anio = EXTRACT(YEAR FROM CURRENT_DATE) AND mes <= EXTRACT(MONTH FROM CURRENT_DATE))
         OR (anio = EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL '1 year') AND mes > EXTRACT(MONTH FROM CURRENT_DATE))
      GROUP BY anio, mes
      ORDER BY anio, mes
      LIMIT 6
    `).then(r => r.rows);

    const gastosData = await pool.query(`
      SELECT mes, anio, COALESCE(SUM(monto::numeric), 0) AS total
      FROM gastos
      WHERE (anio = EXTRACT(YEAR FROM CURRENT_DATE) AND mes <= EXTRACT(MONTH FROM CURRENT_DATE))
         OR (anio = EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL '1 year') AND mes > EXTRACT(MONTH FROM CURRENT_DATE))
      GROUP BY anio, mes
      ORDER BY anio, mes
      LIMIT 6
    `).then(r => r.rows);

    // Merge finanzas + gastos por mes
    const merged: Record<string, { ingresos: number; egresos: number }> = {};

    finanzasData.forEach((r: any) => {
      const key = `${r.anio}-${r.mes}`;
      if (!merged[key]) merged[key] = { ingresos: 0, egresos: 0 };
      merged[key].ingresos += parseFloat(r.ingresos) || 0;
      merged[key].egresos += parseFloat(r.egresos) || 0;
    });

    gastosData.forEach((r: any) => {
      const key = `${r.anio}-${r.mes}`;
      if (!merged[key]) merged[key] = { ingresos: 0, egresos: 0 };
      merged[key].egresos += parseFloat(r.total) || 0;
    });

    const serie = Object.entries(merged)
      .sort()
      .map(([key, val]) => {
        const [, mesStr] = key.split("-");
        return { mes: monthNames[parseInt(mesStr) - 1] || mesStr, ...val };
      });

    // Por lote
    const lotes = await pool.query(`
      SELECT lote,
        COALESCE(SUM(ingresos::numeric), 0)::float AS ingresos,
        COALESCE(SUM(egresos::numeric), 0)::float AS egresos
      FROM finanzas
      GROUP BY lote ORDER BY ingresos DESC
    `).then(r => r.rows);

    const porLote = lotes.map((r: any) => ({
      lote: r.lote,
      ingresos: parseFloat(r.ingresos) || 0,
      egresos: parseFloat(r.egresos) || 0,
    }));

    logger.info("Dashboard gráficos consultados exitosamente");

    return c.json({ success: true, data: { serie, porLote } });
  } catch (error) {
    logger.error("Error en gráficos:", error);
    throw new AppError("Error obteniendo datos de gráficos", "FETCH_ERROR", 500);
  }
});

/**
 * GET /api/dashboard/tareas-proximas
 * Tareas sanitarias próximas (próximos 7 días)
 */
dashboardRoutes.get("/tareas-proximas", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);

  try {
    const tareas = await pool.query(`
      SELECT s.id, b.nombre AS animal, b.chip, s.tipo, s.proxima_fecha, s.veterinario
      FROM salud s
      JOIN bovinos b ON b.id = s.animal_id
      WHERE s.estado = 'pendiente'
        AND s.proxima_fecha IS NOT NULL
        AND s.proxima_fecha BETWEEN CURRENT_DATE AND CURRENT_DATE + 7
      ORDER BY s.proxima_fecha
    `).then(r => r.rows);

    logger.info(`Tareas próximas (7d): ${tareas.length}`);

    return c.json({ success: true, data: tareas });
  } catch (error) {
    logger.error("Error en tareas próximas:", error);
    throw new AppError("Error obteniendo tareas próximas", "FETCH_ERROR", 500);
  }
});

/**
 * GET /api/dashboard/partos-proximos
 * Partos estimados próximos (30 días)
 */
dashboardRoutes.get("/partos-proximos", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);

  try {
    const partos = await pool.query(`
      SELECT r.id, b.nombre AS hembra, b.chip, r.dias_gestacion, r.parto_estimado
      FROM reproduccion r
      JOIN bovinos b ON b.id = r.hembra_id
      WHERE r.estado IN ('confirmada','evaluacion')
        AND r.parto_estimado BETWEEN CURRENT_DATE AND CURRENT_DATE + 30
      ORDER BY r.parto_estimado
    `).then(r => r.rows);

    const ahora = Date.now();
    const partosConGestacion = partos.map((r: any) => {
      let diasGestacion = r.dias_gestacion;
      if (r.parto_estimado) {
        const diasRestantes = Math.ceil((new Date(r.parto_estimado).getTime() - ahora) / (24 * 60 * 60 * 1000));
        diasGestacion = Math.max(0, 283 - diasRestantes);
      }
      return { ...r, diasGestacion };
    });

    logger.info(`Partos próximos (30d): ${partosConGestacion.length}`);

    return c.json({ success: true, data: partosConGestacion });
  } catch (error) {
    logger.error("Error en partos próximos:", error);
    throw new AppError("Error obteniendo partos próximos", "FETCH_ERROR", 500);
  }
});

export default dashboardRoutes;
