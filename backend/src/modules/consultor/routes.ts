import { Hono } from "hono";
import { pool } from "@/db/index.js";
import { getCurrentUser } from "@/lib/jwt.js";
import { AppError } from "@/lib/errors.js";
import logger from "@/utils/logger.js";

export const consultorRoutes = new Hono();

function evaluarRegla(condicionSql: string): Promise<boolean> {
  return pool.query(`SELECT EXISTS (${condicionSql}) AS activa`)
    .then((r) => r.rows[0]?.activa === true)
    .catch((e) => {
      logger.error("Error evaluando regla:", e);
      return false;
    });
}

consultorRoutes.get("/alertas", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);

  try {
    const reglas = await pool.query(
      "SELECT id, categoria, prioridad, condicion_sql, mensaje_alerta, recomendacion FROM consultor_reglas WHERE activo = true ORDER BY prioridad"
    );

    const activas = await Promise.all(
      reglas.rows.map(async (r) => {
        const activa = await evaluarRegla(r.condicion_sql);
        return activa ? { categoria: r.categoria, prioridad: r.prioridad, mensaje_alerta: r.mensaje_alerta, recomendacion: r.recomendacion } : null;
      })
    );

    const resultado: { categoria: string; prioridad: string; mensaje_alerta: string; recomendacion: string | null }[] = activas.filter((x): x is NonNullable<typeof x> => x !== null);

    resultado.sort((a, b) => {
      const p = { alta: 1, media: 2, baja: 3 };
      return (p[a.prioridad as keyof typeof p] || 9) - (p[b.prioridad as keyof typeof p] || 9);
    });

    return c.json({ success: true, data: resultado });
  } catch (error) {
    logger.error("Error consultando alertas:", error);
    throw new AppError("Error obteniendo alertas", "FETCH_ERROR", 500);
  }
});

/**
 * GET /api/consultor/resumen
 * Análisis inteligente del hato: composición, salud, reproducción, finanzas, tendencias y recomendaciones
 */
consultorRoutes.get("/resumen", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);

  try {
    /* ────────── ESTADÍSTICAS DEL HATO (case-insensitive sexo) ────────── */
    const total = await pool.query("SELECT COUNT(*)::int AS c FROM bovinos").then(r => r.rows[0]?.c || 0);
    const hembras = await pool.query("SELECT COUNT(*)::int AS c FROM bovinos WHERE LOWER(sexo) = 'hembra'").then(r => r.rows[0]?.c || 0);
    const machos = total - hembras;
    const disponibles = await pool.query("SELECT COUNT(*)::int AS c FROM bovinos WHERE estado = 'disponible'").then(r => r.rows[0]?.c || 0);
    const vendidos = await pool.query("SELECT COUNT(*)::int AS c FROM bovinos WHERE estado = 'vendido'").then(r => r.rows[0]?.c || 0);
    const preñezEst = await pool.query("SELECT COUNT(*)::int AS c FROM bovinos WHERE estado = 'preñez'").then(r => r.rows[0]?.c || 0);
    const fallecidos = await pool.query("SELECT COUNT(*)::int AS c FROM bovinos WHERE estado = 'fallecido'").then(r => r.rows[0]?.c || 0);

    /* ────────── COMPOSICIÓN POR RAZA ────────── */
    const razas = await pool.query(`
      SELECT raza, COUNT(*)::int AS count FROM bovinos
      WHERE raza IS NOT NULL AND raza != ''
      GROUP BY raza ORDER BY count DESC
    `).then(r => r.rows);

    /* ────────── DISTRIBUCIÓN POR EDAD ────────── */
    const edadGrupos = await pool.query(`
      SELECT
        CASE
          WHEN nacimiento IS NULL THEN 'sin registro'
          WHEN CURRENT_DATE - nacimiento < 365 THEN 'ternero (<1 año)'
          WHEN CURRENT_DATE - nacimiento BETWEEN 365 AND 730 THEN 'joven (1-2 años)'
          WHEN CURRENT_DATE - nacimiento BETWEEN 731 AND 1460 THEN 'adulto (2-4 años)'
          ELSE 'veterano (>4 años)'
        END AS grupo,
        COUNT(*)::int AS count
      FROM bovinos
      GROUP BY grupo
    `).then(r => r.rows);

    /* ────────── PESO PROMEDIO POR SEXO (case-insensitive) ────────── */
    const pesoProm = await pool.query(`
      SELECT ROUND(AVG(peso_actual::numeric), 1)::float AS hembras
      FROM bovinos WHERE LOWER(sexo) = 'hembra' AND peso_actual IS NOT NULL
    `).then(r => r.rows[0]?.hembras || 0);
    const pesoPromM = await pool.query(`
      SELECT ROUND(AVG(peso_actual::numeric), 1)::float AS machos
      FROM bovinos WHERE LOWER(sexo) = 'macho' AND peso_actual IS NOT NULL
    `).then(r => r.rows[0]?.machos || 0);

    /* ────────── REPRODUCCIÓN AVANZADA ────────── */
    const preñadas = await pool.query(`
      SELECT COUNT(*)::int AS c FROM reproduccion r
      JOIN bovinos b ON b.id = r.hembra_id
      WHERE r.estado IN ('confirmada','evaluacion')
      AND (r.dias_gestacion IS NULL OR r.dias_gestacion > 0)
    `).then(r => r.rows[0]?.c || 0);

    const gestacionDetalle = await pool.query(`
      SELECT r.id, b.nombre, b.chip, b.raza, r.dias_gestacion, r.parto_estimado, r.estado
      FROM reproduccion r JOIN bovinos b ON b.id = r.hembra_id
      WHERE r.estado IN ('confirmada','evaluacion')
      AND (r.dias_gestacion IS NULL OR r.dias_gestacion > 0)
      ORDER BY r.dias_gestacion DESC NULLS LAST
    `).then(r => r.rows);

    const proximosPartos = await pool.query(`
      SELECT COUNT(*)::int AS c, json_agg(json_build_object('nombre', b.nombre, 'chip', b.chip, 'dias', r.dias_gestacion, 'estimado', r.parto_estimado)) AS animales
      FROM reproduccion r JOIN bovinos b ON b.id = r.hembra_id
      WHERE r.estado IN ('confirmada','evaluacion')
      AND r.parto_estimado BETWEEN CURRENT_DATE AND CURRENT_DATE + 30
    `).then(r => r.rows[0]);

    const partosProximosAnimales = proximosPartos?.animales || [];
    const partos30d = proximosPartos?.c || 0;

    const sinPartoEstimado = await pool.query(`
      SELECT COUNT(*)::int AS c FROM reproduccion r
      JOIN bovinos b ON b.id = r.hembra_id
      WHERE r.estado IN ('confirmada','evaluacion')
      AND r.parto_estimado IS NULL
    `).then(r => r.rows[0]?.c || 0);

    const partoInminente = await pool.query(`
      SELECT COUNT(*)::int AS c FROM reproduccion r
      JOIN bovinos b ON b.id = r.hembra_id
      WHERE r.estado IN ('confirmada','evaluacion')
      AND r.dias_gestacion >= 260
    `).then(r => r.rows[0]?.c || 0);

    const hembrasDisponiblesServicio = await pool.query(`
      SELECT COUNT(*)::int AS c FROM bovinos
      WHERE LOWER(sexo) = 'hembra' AND estado IN ('activo','disponible')
      AND id NOT IN (
        SELECT hembra_id FROM reproduccion
        WHERE estado IN ('confirmada','evaluacion')
        AND (dias_gestacion IS NULL OR dias_gestacion > 0)
      )
    `).then(r => r.rows[0]?.c || 0);

    const inseminaciones = await pool.query(`
      SELECT
        COUNT(*)::int AS total_mes,
        COUNT(*) FILTER (WHERE estado = 'confirmada')::int AS confirmadas_mes,
        COUNT(*) FILTER (WHERE estado = 'aborto')::int AS abortos_mes
      FROM reproduccion
      WHERE EXTRACT(MONTH FROM fecha_inseminacion) = EXTRACT(MONTH FROM CURRENT_DATE)
      AND EXTRACT(YEAR FROM fecha_inseminacion) = EXTRACT(YEAR FROM CURRENT_DATE)
    `).then(r => r.rows[0]);

    const inseminacionesMes = inseminaciones?.total_mes || 0;
    const abortosMes = inseminaciones?.abortos_mes || 0;

    const histInseminaciones6m = await pool.query(`
      SELECT COUNT(*)::int AS c FROM reproduccion
      WHERE fecha_inseminacion >= CURRENT_DATE - INTERVAL '6 months'
    `).then(r => r.rows[0]?.c || 0);

    /* ────────── TENDENCIAS (mes anterior) ────────── */
    const insemMesAnterior = await pool.query(`
      SELECT COUNT(*)::int AS c FROM reproduccion
      WHERE EXTRACT(MONTH FROM fecha_inseminacion) = EXTRACT(MONTH FROM CURRENT_DATE - INTERVAL '1 month')
      AND EXTRACT(YEAR FROM fecha_inseminacion) = EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL '1 month')
    `).then(r => r.rows[0]?.c || 0);

    /* ────────── SALUD ────────── */
    const vacunasPendientesDetalle = await pool.query(`
      SELECT s.id, b.nombre, b.chip, b.raza, s.proxima_fecha, s.notas
      FROM salud s JOIN bovinos b ON b.id = s.animal_id
      WHERE s.tipo = 'vacuna' AND s.estado = 'pendiente'
      AND s.proxima_fecha IS NOT NULL
      ORDER BY s.proxima_fecha
    `).then(r => r.rows);

    const vacunasProximasDetalle = vacunasPendientesDetalle.filter(
      (v: any) => v.proxima_fecha && new Date(v.proxima_fecha) <= new Date(Date.now() + 7 * 86400000)
    );
    const vacunasProximas = vacunasProximasDetalle.length;

    const chequeosPendientes = await pool.query(`
      SELECT COUNT(*)::int AS c FROM salud WHERE tipo = 'chequeo' AND estado = 'pendiente'
    `).then(r => r.rows[0]?.c || 0);

    const desparasitacionesPendientes = await pool.query(`
      SELECT COUNT(*)::int AS c FROM salud WHERE tipo = 'desparasitacion' AND estado = 'pendiente'
      AND (proxima_fecha IS NULL OR proxima_fecha <= CURRENT_DATE + 30)
    `).then(r => r.rows[0]?.c || 0);

    const ultimaVacunaAftosa = await pool.query(`
      SELECT MAX(s.fecha) AS fecha FROM salud s
      WHERE s.tipo = 'vacuna' AND s.estado = 'aplicado'
      AND s.notas ILIKE '%aftosa%'
    `).then(r => r.rows[0]?.fecha);

    /* Salud eventos aplicados este mes (para tendencia) */
    const saludAplicadasMes = await pool.query(`
      SELECT COUNT(*)::int AS c FROM salud
      WHERE estado = 'aplicado'
      AND EXTRACT(MONTH FROM fecha) = EXTRACT(MONTH FROM CURRENT_DATE)
      AND EXTRACT(YEAR FROM fecha) = EXTRACT(YEAR FROM CURRENT_DATE)
    `).then(r => r.rows[0]?.c || 0);

    const saludAplicadasMesAnterior = await pool.query(`
      SELECT COUNT(*)::int AS c FROM salud
      WHERE estado = 'aplicado'
      AND EXTRACT(MONTH FROM fecha) = EXTRACT(MONTH FROM CURRENT_DATE - INTERVAL '1 month')
      AND EXTRACT(YEAR FROM fecha) = EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL '1 month')
    `).then(r => r.rows[0]?.c || 0);

    /* ────────── NUTRICIÓN ────────── */
    const conPerdidaPeso = await pool.query(`
      SELECT COUNT(*)::int AS c FROM bovinos
      WHERE peso_actual IS NOT NULL AND peso_inicial IS NOT NULL
      AND peso_actual < peso_inicial * 0.95 AND estado = 'activo'
    `).then(r => r.rows[0]?.c || 0);

    const perdidaPesoDetalle = await pool.query(`
      SELECT nombre, chip, peso_actual, peso_inicial,
        ROUND((1 - peso_actual::numeric / peso_inicial::numeric) * 100, 1)::float AS perdido_pct
      FROM bovinos
      WHERE peso_actual IS NOT NULL AND peso_inicial IS NOT NULL
      AND peso_actual < peso_inicial * 0.95 AND estado = 'activo'
      ORDER BY perdido_pct DESC
    `).then(r => r.rows);

    const bajoPesoEdad = await pool.query(`
      SELECT COUNT(*)::int AS c FROM bovinos
      WHERE nacimiento IS NOT NULL AND peso_actual IS NOT NULL
      AND CURRENT_DATE - nacimiento > 300 AND peso_actual < 150
      AND estado = 'activo'
    `).then(r => r.rows[0]?.c || 0);

    /* ────────── CRUCE SALUD × REPRODUCCIÓN ────────── */
    const gestantesConSaludPendiente = await pool.query(`
      SELECT COUNT(DISTINCT b.id)::int AS c
      FROM bovinos b
      JOIN reproduccion r ON r.hembra_id = b.id AND r.estado IN ('confirmada','evaluacion')
      JOIN salud s ON s.animal_id = b.id AND s.estado = 'pendiente'
    `).then(r => r.rows[0]?.c || 0);

    const gestantesConSaludDetalle = await pool.query(`
      SELECT DISTINCT b.id, b.nombre, b.chip, b.raza, s.tipo, s.proxima_fecha
      FROM bovinos b
      JOIN reproduccion r ON r.hembra_id = b.id AND r.estado IN ('confirmada','evaluacion')
      JOIN salud s ON s.animal_id = b.id AND s.estado = 'pendiente'
      ORDER BY b.nombre
    `).then(r => r.rows);

    const partosConSalud = await pool.query(`
      SELECT COUNT(DISTINCT b.id)::int AS c
      FROM bovinos b
      JOIN reproduccion r ON r.hembra_id = b.id AND r.estado IN ('confirmada','evaluacion')
        AND r.parto_estimado BETWEEN CURRENT_DATE AND CURRENT_DATE + 30
      JOIN salud s ON s.animal_id = b.id AND s.estado = 'pendiente'
    `).then(r => r.rows[0]?.c || 0);

    /* ────────── FINANZAS EN VIVO ────────── */
    const finanzasMes = await pool.query(`
      SELECT
        COALESCE(SUM(ingresos::numeric), 0)::float AS ingresos,
        COALESCE(SUM(egresos::numeric), 0)::float AS egresos
      FROM finanzas
      WHERE mes = EXTRACT(MONTH FROM CURRENT_DATE)::int
      AND anio = EXTRACT(YEAR FROM CURRENT_DATE)::int
    `).then(r => r.rows[0] || { ingresos: 0, egresos: 0 });

    const gastosMes = await pool.query(`
      SELECT COALESCE(SUM(monto::numeric), 0)::float AS total
      FROM gastos
      WHERE mes = EXTRACT(MONTH FROM CURRENT_DATE)::int
      AND anio = EXTRACT(YEAR FROM CURRENT_DATE)::int
    `).then(r => r.rows[0]?.total || 0);

    const finanzasMesAnterior = await pool.query(`
      SELECT
        COALESCE(SUM(ingresos::numeric), 0)::float AS ingresos,
        COALESCE(SUM(egresos::numeric), 0)::float AS egresos
      FROM finanzas
      WHERE mes = EXTRACT(MONTH FROM CURRENT_DATE - INTERVAL '1 month')::int
      AND anio = EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL '1 month')::int
    `).then(r => r.rows[0] || { ingresos: 0, egresos: 0 });

    const gastosMesAnterior = await pool.query(`
      SELECT COALESCE(SUM(monto::numeric), 0)::float AS total
      FROM gastos
      WHERE mes = EXTRACT(MONTH FROM CURRENT_DATE - INTERVAL '1 month')::int
      AND anio = EXTRACT(YEAR FROM CURRENT_DATE - INTERVAL '1 month')::int
    `).then(r => r.rows[0]?.total || 0);

    const tieneFinanzas = finanzasMes.ingresos > 0 || finanzasMes.egresos > 0 || gastosMes > 0;

    const totalEgresos = finanzasMes.egresos + gastosMes;
    const margen = finanzasMes.ingresos - totalEgresos;
    const totalEgresosAnterior = finanzasMesAnterior.egresos + gastosMesAnterior;
    const margenAnterior = finanzasMesAnterior.ingresos - totalEgresosAnterior;

    /* ────────── INDICADORES COMPUESTOS ────────── */
    const tasaPreñez = hembras > 0 ? Math.round((preñadas / hembras) * 100) : 0;
    const pctDisponibles = total > 0 ? Math.round((disponibles / total) * 100) : 0;

    /* Tendencia de inseminaciones */
    const tendenciaInsem: "subiendo" | "bajando" | "estable" = insemMesAnterior === 0 && inseminacionesMes === 0
      ? "estable"
      : inseminacionesMes > insemMesAnterior ? "subiendo" : inseminacionesMes < insemMesAnterior ? "bajando" : "estable";

    const tendenciaSalud: "subiendo" | "bajando" | "estable" = saludAplicadasMes > saludAplicadasMesAnterior
      ? "subiendo" : saludAplicadasMes < saludAplicadasMesAnterior ? "bajando" : "estable";

    /* ────────── GENERAR INSIGHTS INTELIGENTES ────────── */
    const insights: { tipo: "positivo" | "alerta" | "info" | "recomendacion"; icono: string; titulo: string; mensaje: string }[] = [];

    /* Composición del hato */
    const razaInfo = razas.map((r: any) => `${r.raza} (${r.count})`).join(", ");
    insights.push({
      tipo: "info",
      icono: "📊",
      titulo: "Composición del hato",
      mensaje: `${total} bovinos totales: ${machos}♂ ${hembras}♀. Razas: ${razaInfo || "sin registro"}. ${edadGrupos.map((e: any) => `${e.grupo}: ${e.count}`).join(". ")}. Peso promedio: ♀${pesoProm}kg ♂${pesoPromM}kg.`,
    });

    /* Análisis reproductivo */
    if (preñadas > 0) {
      const pctParto30d = Math.round((partos30d / preñadas) * 100);
      const sinPartoMsg = sinPartoEstimado > 0
        ? ` ⚠️ ${sinPartoEstimado} gestante${sinPartoEstimado > 1 ? "s" : ""} no tiene parto estimado registrado.`
        : "";
      let partoMsg: string;
      if (partos30d === 0 && sinPartoEstimado === 0) {
        partoMsg = `Ninguna de las ${preñadas} gestantes tiene parto en los próximos 30 días (gestación temprana).`;
      } else if (partos30d === 0 && sinPartoEstimado > 0) {
        partoMsg = `${preñadas} gestantes, pero ${sinPartoEstimado} sin fecha de parto estimado. Registre las fechas para planificar.`;
      } else {
        partoMsg = `${pctParto30d}% de gestantes (${partos30d}) parirán en ≤30 días. ${sinPartoMsg}`;
      }

      if (partoInminente > 0) {
        insights.push({
          tipo: "alerta",
          icono: "🚨",
          titulo: `Parto inminente en ${partoInminente} vaca${partoInminente > 1 ? "s" : ""}`,
          mensaje: `${partoInminente} gestante${partoInminente > 1 ? "s" : ""} tiene${partoInminente > 1 ? "n" : ""} ≥260 días de gestación. Prepare kit de parto: yodo, oxitocina, vendas, guantes. Monitoree cada 4 horas.`,
        });
      }

      /* Cruce salud × gestación */
      if (gestantesConSaludPendiente > 0) {
        const detalleGestSalud = gestantesConSaludDetalle.map((g: any) =>
          `${g.nombre || g.chip} (${g.tipo}${g.proxima_fecha ? ` - ${new Date(g.proxima_fecha).toLocaleDateString("es-BO")}` : ""})`
        ).join(", ");
        insights.push({
          tipo: "alerta",
          icono: "🤰",
          titulo: `${gestantesConSaludPendiente} gestante${gestantesConSaludPendiente > 1 ? "s" : ""} con salud pendiente`,
          mensaje: `Animales: ${detalleGestSalud}. Atienda los eventos de salud en gestantes antes del parto para reducir riesgo neonatal.`,
        });
      }

      if (partosConSalud > 0) {
        insights.push({
          tipo: "recomendacion",
          icono: "📋",
          titulo: "Salud pendiente en próximos partos",
          mensaje: `${partosConSalud} vaca${partosConSalud > 1 ? "s" : ""} que parirán en ≤30 días tienen eventos de salud pendientes. Programe las aplicaciones antes de la fecha estimada de parto.`,
        });
      }

      insights.push({
        tipo: partoInminente > 0 ? "alerta" : "info",
        icono: "🐮",
        titulo: `Gestación: ${preñadas} hembras (${tasaPreñez}% del hato)`,
        mensaje: partoMsg,
      });
    }

    if (hembrasDisponiblesServicio > 0 && preñadas > 0) {
      insights.push({
        tipo: "recomendacion",
        icono: "💡",
        titulo: `${hembrasDisponiblesServicio} hembra${hembrasDisponiblesServicio > 1 ? "s" : ""} disponible${hembrasDisponiblesServicio > 1 ? "s" : ""} para servicio`,
        mensaje: `${hembrasDisponiblesServicio} hembra${hembrasDisponiblesServicio > 1 ? "s" : ""} activa${hembrasDisponiblesServicio > 1 ? "s" : ""} no está${hembrasDisponiblesServicio > 1 ? "n" : ""} gestante. ${tasaPreñez < 60 ? "La tasa de preñez está por debajo del óptimo (60-85%). Evalúe detección de celo y condición corporal antes del servicio." : "Programe detección de celo e inseminación en las próximas semanas para mantener la tasa de preñez."}`,
      });
    }

    if (histInseminaciones6m === 0 && total > 0) {
      insights.push({
        tipo: "alerta",
        icono: "🧬",
        titulo: "Sin actividad reproductiva en 6 meses",
        mensaje: "No se registraron inseminaciones en los últimos 6 meses. Revise el plan reproductivo del hato. Si hay hembras en edad fértil, considere iniciar un programa de inseminación.",
      });
    }

    if (abortosMes > 0) {
      insights.push({
        tipo: "alerta",
        icono: "⚠️",
        titulo: `${abortosMes} aborto${abortosMes > 1 ? "s" : ""} registrado${abortosMes > 1 ? "s" : ""} este mes`,
        mensaje: `${abortosMes} aborto${abortosMes > 1 ? "s" : ""} en lo que va del mes. Causas comunes: leptospirosis, brucelosis, deficiencias nutricionales. Tome muestras para laboratorio y revise protocolo sanitario.`,
      });
    }

    /* IATF: Vacas con múltiples negativos */
    const vacasIatfLimite = await pool.query(`
      SELECT COUNT(*)::int AS c FROM (
        SELECT r.hembra_id
        FROM reproduccion r
        WHERE r.tipo_servicio = 'iatf' AND r.resultado = 'negativo'
        GROUP BY r.hembra_id
        HAVING COUNT(*) >= 3
      ) sub
    `).then(r => r.rows[0]?.c || 0);

    if (vacasIatfLimite > 0) {
      const detalleVacas = await pool.query(`
        SELECT b.nombre, b.chip, COUNT(*) AS total_negativos
        FROM reproduccion r
        JOIN bovinos b ON b.id = r.hembra_id
        WHERE r.tipo_servicio = 'iatf' AND r.resultado = 'negativo'
        GROUP BY b.id, b.nombre, b.chip
        HAVING COUNT(*) >= 3
        ORDER BY total_negativos DESC
        LIMIT 5
      `).then(r => r.rows);

      const nombres = detalleVacas.map((v: any) => `${v.nombre || v.chip} (${v.total_negativos}x)`).join(", ");
      insights.push({
        tipo: "alerta",
        icono: "🚨",
        titulo: `${vacasIatfLimite} vaca${vacasIatfLimite > 1 ? "s" : ""} con ≥3 IATF negativas`,
        mensaje: `Requieren evaluación: ${nombres}. Considere: examen ginecológico, diagnóstico de repetición de celo o descarte por infertilidad. El máximo recomendado es 3-4 servicios por temporada.`,
      });
    }

    /* Toros descartados */
    const torosDescartados = await pool.query(`
      SELECT COUNT(*)::int AS c FROM toros WHERE descartado = true
    `).then(r => r.rows[0]?.c || 0);

    if (torosDescartados > 0) {
      const nombresTorosDesc = await pool.query(`
        SELECT nombre, motivo_descarte FROM toros WHERE descartado = true LIMIT 5
      `).then(r => r.rows);

      const descList = nombresTorosDesc.map((t: any) => `${t.nombre}${t.motivo_descarte ? ` (${t.motivo_descarte})` : ""}`).join(", ");
      insights.push({
        tipo: "info",
        icono: "🐂",
        titulo: `${torosDescartados} toro${torosDescartados > 1 ? "s" : ""} descartado${torosDescartados > 1 ? "s" : ""} del programa`,
        mensaje: `Toros: ${descList}. Verifique que no se estén utilizando en servicios naturales o IATF.`,
      });
    }

    /* Vacas sin IATF registrada */
    const hembrasSinIatf = await pool.query(`
      SELECT COUNT(*)::int AS c FROM bovinos
      WHERE LOWER(sexo) = 'hembra' AND estado IN ('activo', 'disponible')
      AND id NOT IN (SELECT hembra_id FROM reproduccion WHERE tipo_servicio = 'iatf')
      AND nacimiento IS NOT NULL AND CURRENT_DATE - nacimiento > 730
    `).then(r => r.rows[0]?.c || 0);

    if (hembrasSinIatf > 0) {
      insights.push({
        tipo: "recomendacion",
        icono: "🐮",
        titulo: `${hembrasSinIatf} hembra${hembrasSinIatf > 1 ? "s" : ""} adulta${hembrasSinIatf > 1 ? "s" : ""} sin IATF registrada`,
        mensaje: `${hembrasSinIatf} hembra${hembrasSinIatf > 1 ? "s" : ""} mayor${hembrasSinIatf > 1 ? "es" : ""} de 2 años sin registro de IATF. Detecte celo e inicie el programa reproductivo.`,
      });
    }

    /* Recomendaciones IATF */
    if (vacasIatfLimite > 0) {
      recomendaciones.push({
        prioridad: "alta",
        area: "reproduccion",
        accion: `Evaluar ${vacasIatfLimite} vaca${vacasIatfLimite > 1 ? "s" : ""} con IATF repetidas`,
        detalle: `${vacasIatfLimite} vaca${vacasIatfLimite > 1 ? "s" : ""} con 3 o más servicios negativos. Programe examen ginecológico completo.`,
      });
    }

    /* Tendencia inseminaciones */
    if (inseminacionesMes > 0 && tendenciaInsem !== "estable") {
      insights.push({
        tipo: tendenciaInsem === "subiendo" ? "positivo" : "alerta",
        icono: tendenciaInsem === "subiendo" ? "📈" : "📉",
        titulo: `Inseminaciones: ${tendenciaInsem === "subiendo" ? "subiendo" : "bajando"} vs mes anterior`,
        mensaje: `${inseminacionesMes} este mes vs ${insemMesAnterior} el mes pasado. ${tendenciaInsem === "subiendo" ? "Mantenga el ritmo de detección de celo." : "Revise protocolo de inseminación y condición corporal de hembras."}`,
      });
    }

    /* Tendencia salud */
    if (tendenciaSalud !== "estable") {
      insights.push({
        tipo: tendenciaSalud === "subiendo" ? "positivo" : "info",
        icono: tendenciaSalud === "subiendo" ? "✅" : "ℹ️",
        titulo: `Eventos de salud aplicados: ${tendenciaSalud === "subiendo" ? "más" : "menos"} que el mes pasado`,
        mensaje: `${saludAplicadasMes} aplicaciones este mes vs ${saludAplicadasMesAnterior} el mes anterior. ${tendenciaSalud === "bajando" ? "Verifique que no se estén acumulando eventos pendientes." : "Buen ritmo de trabajo sanitario."}`,
      });
    }

    /* Análisis de salud */
    if (vacunasProximas > 0) {
      const nombresVacunas = vacunasProximasDetalle.map((v: any) => `${v.nombre || v.chip} (${new Date(v.proxima_fecha).toLocaleDateString("es-BO")})`).join(", ");
      insights.push({
        tipo: vacunasProximas > 3 ? "alerta" : "info",
        icono: "💉",
        titulo: `${vacunasProximas} vacuna${vacunasProximas > 1 ? "s" : ""} pendiente${vacunasProximas > 1 ? "s" : ""} (próximos 7 días)`,
        mensaje: `Animales: ${nombresVacunas}. ${vacunasProximas > 3 ? "Agende la aplicación cuanto antes para evitar acumulación." : "Programe las aplicaciones según disponibilidad."}`,
      });
    }

    if (ultimaVacunaAftosa) {
      const diffDays = Math.floor((Date.now() - new Date(ultimaVacunaAftosa).getTime()) / 86400000);
      const meses = Math.floor(diffDays / 30);
      if (meses > 6) {
        insights.push({
          tipo: "alerta",
          icono: "🛡️",
          titulo: `Vacuna contra aftosa vencida (${meses} meses)`,
          mensaje: `Han pasado ${meses} meses desde la última aplicación. El calendario SENASAG exige refuerzo cada 6 meses. Programe la campaña de vacunación urgente.`,
        });
      } else if (meses > 4) {
        insights.push({
          tipo: "recomendacion",
          icono: "📅",
          titulo: "Próxima campaña aftosa",
          mensaje: `Última dosis hace ${meses} meses. Prepárese para la próxima campaña SENASAG en los próximos ${6 - meses} meses.`,
        });
      }
    } else {
      insights.push({
        tipo: "alerta",
        icono: "🛡️",
        titulo: "Sin registro de vacuna contra aftosa",
        mensaje: "No se encontró ningún registro de vacunación contra aftosa. La normativa SENASAG exige dos dosis anuales. Programe la primera campaña lo antes posible.",
      });
    }

    if (desparasitacionesPendientes > 0) {
      insights.push({
        tipo: "info",
        icono: "🪱",
        titulo: `${desparasitacionesPendientes} desparasitación${desparasitacionesPendientes > 1 ? "es" : ""} pendiente${desparasitacionesPendientes > 1 ? "s" : ""}`,
        mensaje: `${desparasitacionesPendientes} desparasitación${desparasitacionesPendientes > 1 ? "es" : ""} programada${desparasitacionesPendientes > 1 ? "s" : ""} para los próximos 30 días. En el trópico, alterne Ivermectina y Albendazol para evitar resistencia.`,
      });
    }

    /* Análisis nutricional */
    if (conPerdidaPeso > 0) {
      const detallePeso = perdidaPesoDetalle.map((p: any) => `${p.nombre || p.chip} (-${p.perdido_pct}%)`).join(", ");
      insights.push({
        tipo: conPerdidaPeso > 5 ? "alerta" : "info",
        icono: "📉",
        titulo: `${conPerdidaPeso} bovino${conPerdidaPeso > 1 ? "s" : ""} con pérdida de peso`,
        mensaje: `Animales: ${detallePeso}. Revise: calidad de forraje, carga animal, suplementación mineral. En época seca, considere silo de maíz o caña picada.`,
      });
    }

    if (bajoPesoEdad > 0) {
      insights.push({
        tipo: "alerta",
        icono: "🐄",
        titulo: `${bajoPesoEdad} ternero${bajoPesoEdad > 1 ? "s" : ""} con bajo peso para su edad`,
        mensaje: `${bajoPesoEdad} ternero${bajoPesoEdad > 1 ? "s" : ""} >10 meses pesa${bajoPesoEdad > 1 ? "n" : ""} menos de 150kg. Peso esperado al destete (7-8m): 180-220kg. Suplemente con concentrado proteico y sales minerales.`,
      });
    }

    /* Análisis de ventas */
    if (pctDisponibles > 30) {
      insights.push({
        tipo: "info",
        icono: "💰",
        titulo: `${disponibles} bovinos disponibles para venta (${pctDisponibles}%)`,
        mensaje: `Buena oferta de animales. Revise precios de mercado: novillo gordo ~$2.50-3.00/kg, vaquilla ~$2.00-2.50/kg. Considere vender antes de la época seca para reducir costos de alimentación.`,
      });
    } else if (pctDisponibles > 0) {
      insights.push({
        tipo: "recomendacion",
        icono: "🐂",
        titulo: `${disponibles} disponible${disponibles > 1 ? "s" : ""} para venta (${pctDisponibles}%)`,
        mensaje: `Stock bajo para ventas inmediatas. Si necesita liquidez, identifique animales con bajo rendimiento (perdida de peso, sin gestación) para descarte.`,
      });
    }

    /* Distribución del hato */
    insights.push({
      tipo: "info",
      icono: "📋",
      titulo: "Distribución del hato",
      mensaje: `Activos: ${total - disponibles - vendidos - preñezEst - fallecidos} | Disponibles: ${disponibles} | Vendidos: ${vendidos} | Preñez: ${preñezEst} | Fallecidos: ${fallecidos}`,
    });

    /* Finanzas en vivo */
    if (tieneFinanzas) {
      const signoMargen = margen >= 0 ? "positivo" : "negativo";
      const tendenciaMargen = margen > margenAnterior ? "mejoró" : margen < margenAnterior ? "empeoró" : "se mantuvo";
      insights.push({
        tipo: margen >= 0 ? "positivo" : "alerta",
        icono: "📈",
        titulo: `Margen del mes: $${margen.toLocaleString("es-BO", { minimumFractionDigits: 2 })}`,
        mensaje: `Ingresos: $${finanzasMes.ingresos.toLocaleString("es-BO", { minimumFractionDigits: 2 })} | Egresos: $${totalEgresos.toLocaleString("es-BO", { minimumFractionDigits: 2 })}. El margen ${tendenciaMargen} vs el mes anterior ($${margenAnterior.toLocaleString("es-BO", { minimumFractionDigits: 2 })}). ${signoMargen === "positivo" ? "Salud financiera estable." : "Revise y reduzca costos operativos."}`,
      });
    }

    /* ────────── GENERAR RECOMENDACIONES PERSONALIZADAS ────────── */
    const recomendaciones: { prioridad: "alta" | "media" | "baja"; area: string; accion: string; detalle: string }[] = [];

    if (vacunasProximas > 0) {
      recomendaciones.push({
        prioridad: "alta",
        area: "salud",
        accion: `Aplicar ${vacunasProximas} vacuna${vacunasProximas > 1 ? "s" : ""} pendiente${vacunasProximas > 1 ? "s" : ""}`,
        detalle: `${vacunasProximasDetalle.map((v: any) => `${v.nombre || v.chip} (${new Date(v.proxima_fecha).toLocaleDateString("es-BO")})`).join(", ")}`,
      });
    }

    if (partoInminente > 0) {
      recomendaciones.push({
        prioridad: "alta",
        area: "reproduccion",
        accion: "Monitorear partos inminentes",
        detalle: `${partoInminente} vaca${partoInminente > 1 ? "s" : ""} con ≥260 días de gestación. Preparar instalaciones y kit de parto.`,
      });
    }

    if (conPerdidaPeso > 0) {
      recomendaciones.push({
        prioridad: "media",
        area: "nutricion",
        accion: "Evaluar alimentación",
        detalle: `${conPerdidaPeso} bovino${conPerdidaPeso > 1 ? "s" : ""} perdieron peso. ${perdidaPesoDetalle.map((p: any) => `${p.nombre || p.chip} (-${p.perdido_pct}%)`).join(", ")}. Suplementar y revisar forraje.`,
      });
    }

    if (gestantesConSaludPendiente > 0) {
      recomendaciones.push({
        prioridad: "alta",
        area: "salud",
        accion: `Atender salud de ${gestantesConSaludPendiente} gestante${gestantesConSaludPendiente > 1 ? "s" : ""} antes del parto`,
        detalle: `${gestantesConSaludDetalle.map((g: any) => `${g.nombre || g.chip} (${g.tipo})`).join(", ")}. Complete estos eventos antes de la fecha estimada de parto.`,
      });
    }

    if (hembrasDisponiblesServicio > 0) {
      recomendaciones.push({
        prioridad: "media",
        area: "reproduccion",
        accion: `Servir ${hembrasDisponiblesServicio} hembra${hembrasDisponiblesServicio > 1 ? "s" : ""} disponible${hembrasDisponiblesServicio > 1 ? "s" : ""}`,
        detalle: `${hembrasDisponiblesServicio} hembra${hembrasDisponiblesServicio > 1 ? "s" : ""} activa${hembrasDisponiblesServicio > 1 ? "s" : ""} sin gestación. Detectar celo e inseminar.`,
      });
    }

    if (histInseminaciones6m === 0 && hembras > 0) {
      recomendaciones.push({
        prioridad: "alta",
        area: "reproduccion",
        accion: "Iniciar programa de inseminación",
        detalle: "Sin actividad reproductiva en 6 meses. Evalúe el hato y diseñe un calendario de servicios.",
      });
    }

    if (bajoPesoEdad > 0) {
      recomendaciones.push({
        prioridad: "media",
        area: "nutricion",
        accion: "Suplementar terneros con bajo peso",
        detalle: `${bajoPesoEdad} ternero${bajoPesoEdad > 1 ? "s" : ""} <150kg >10 meses. Iniciar suplementación con concentrado 1-2% del peso vivo.`,
      });
    }

    if (pctDisponibles < 20 && total > 0) {
      recomendaciones.push({
        prioridad: "baja",
        area: "ventas",
        accion: "Evaluar descarte de animales improductivos",
        detalle: "Stock bajo para ventas. Identifique animales sin gestación o con pérdida de peso crónica para descarte.",
      });
    }

    if (tieneFinanzas && margen < 0) {
      recomendaciones.push({
        prioridad: "alta",
        area: "ventas",
        accion: "Revisar presupuesto mensual",
        detalle: `Margen negativo de $${Math.abs(margen).toLocaleString("es-BO", { minimumFractionDigits: 2 })} este mes. Revise egresos y considere ajustar costos operativos o acelerar ventas.`,
      });
    }

    /* ────────── REVISIÓN DE CALENDARIO DINÁMICO ────────── */
    const mesActual = new Date().getMonth() + 1;
    const calendarioInfo: { mes: number; actividad: string; prioridad: string }[] = [
      { mes: 1, actividad: "Vacunación contra carbunclo sintomático", prioridad: "alta" },
      { mes: 2, actividad: "Desparasitación estratégica fin de lluvias", prioridad: "media" },
      { mes: 3, actividad: "Campaña aftosa SENASAG (1er ciclo)", prioridad: "alta" },
      { mes: 4, actividad: "Vacunación contra brucelosis (terneras 3-8 meses)", prioridad: "alta" },
      { mes: 5, actividad: "Suplementación mineral en época seca", prioridad: "media" },
      { mes: 6, actividad: "Evaluación de condición corporal pre-servicio", prioridad: "media" },
      { mes: 7, actividad: "Diagnóstico de preñez temprano", prioridad: "alta" },
      { mes: 8, actividad: "Preparación potreros para época de lluvias", prioridad: "media" },
      { mes: 9, actividad: "Campaña aftosa SENASAG (2do ciclo)", prioridad: "alta" },
      { mes: 10, actividad: "Desparasitación inicio de lluvias", prioridad: "alta" },
      { mes: 11, actividad: "Vacunación contra septicemia hemorrágica", prioridad: "alta" },
      { mes: 12, actividad: "Balance forrajero y planificación anual", prioridad: "media" },
    ];
    const calendarioMes = calendarioInfo.filter(c => c.mes === mesActual);

    /* ────────── GENERAR ESTADÍSTICAS PLANAS ────────── */
    const stats = {
      totalBovinos: total,
      totalHembras: hembras,
      totalMachos: machos,
      disponibles,
      vendidos,
      fallecidos,
      preñezEstado: preñezEst,
      hembrasGestantes: preñadas,
      proximosPartos30d: partos30d,
      vacunasProximas7d: vacunasProximas,
      chequeosPendientes,
      desparasitacionesPendientes,
      inseminacionesEsteMes: inseminacionesMes,
      abortosEsteMes: abortosMes,
      conPerdidaPeso,
      bajoPesoEdad,
      hembrasDisponiblesServicio,
      partoInminente,
      tasaPreñez,
      pctDisponibles,
      pesoPromHembras: pesoProm,
      pesoPromMachos: pesoPromM,
      /* nuevas métricas */
      gestantesConSaludPendiente,
      insemMesAnterior,
      tendenciaInsem,
      saludAplicadasMes,
      saludAplicadasMesAnterior,
      tendenciaSalud,
      ingresosMes: finanzasMes.ingresos,
      egresosMes: totalEgresos,
      margenMes: margen,
      margenMesAnterior: margenAnterior,
      vacasIatfLimite,
      torosDescartados,
      hembrasSinIatf,
    };

    const probabilidades = insights.filter(i => i.tipo !== "recomendacion");

    return c.json({
      success: true,
      data: {
        stats,
        probabilidades,
        insights,
        recomendaciones,
        calendarioMes,
        faq: [
          {
            pregunta: "¿Cuándo debo vacunar contra la aftosa?",
            respuesta: "El calendario SENASAG establece dos campañas anuales: marzo-abril (primer ciclo) y septiembre-octubre (segundo ciclo). La vacuna debe aplicarse a todos los bovinos mayores de 3 meses. Revise que su hato tenga las dosis al día.",
          },
          {
            pregunta: "¿Cada cuánto desparasitar?",
            respuesta: "Se recomienda cada 3-4 meses en el trópico boliviano, con énfasis al inicio de lluvias (octubre-noviembre) y al final (marzo-abril). Alterne principios activos (Ivermectina, Albendazol, Levamisol) para evitar resistencia.",
          },
          {
            pregunta: "¿Cómo detectar celo en vacas?",
            respuesta: "Signos: inquietud, monta a otras vacas, vulva hinchada y enrojecida, moco cristalino, disminución del apetito. Dura 6-18 horas. El mejor momento para inseminar es 12 horas después del inicio del celo (regla AM-PM).",
          },
          {
            pregunta: "¿Cuándo hacer diagnóstico de preñez?",
            respuesta: "Vía ecografía transrectal: a partir de 28-30 días post-inseminación. Tacto rectal: desde los 45 días. Se recomienda confirmar entre los 35-45 días para repetir servicio a tiempo si es negativa.",
          },
          {
            pregunta: "¿Cuánto pesa un bovino al destete?",
            respuesta: "En el trópico boliviano, el peso al destete (7-8 meses) ronda 180-220 kg en promedio. Razas cebuinas (Brahman, Nelore) tienden al extremo inferior; europeas (Brangus, Braford) al superior. Suplementar con sales mineralizadas desde los 3 meses mejora el peso al destete.",
          },
          {
            pregunta: "¿Cuál es la carga animal recomendada por hectárea?",
            respuesta: "En el trópico boliviano, la carga varía: 0.5-1 UA/ha en pasturas nativas, 1-2 UA/ha en pasturas mejoradas (Brachiaria, Panicum, Tanzania). En época seca, reducir un 30-40% para evitar sobrepastoreo. Una UA (unidad animal) equivale a 450 kg de peso vivo.",
          },
          {
            pregunta: "¿Cómo prevenir la mortalidad neonatal?",
            respuesta: "Asegurar calostro en las primeras 6 horas de vida, instalar el ternero en un área limpia y seca, desinfectar ombligo con tintura de yodo al 7%, y verificar que la madre tenga buena condición corporal al parto (CC ≥ 3).",
          },
          {
            pregunta: "¿Qué hacer si una vaca no expulsa la placenta?",
            respuesta: "Si retiene la placenta más de 12 horas post-parto, aplicar oxitocina y antibiótico de amplio espectro. No extraer manualmente (riesgo de infección). Consultar al veterinario si hay fiebre o mal olor (metritis). Monitorear temperatura corporal 2 veces al día.",
          },
          {
            pregunta: "¿Cómo calcular la edad de mi bovino?",
            respuesta: "Por cronometría dentaria: 2 dientes permanentes = 2 años, 4 dientes = 3 años, 6 dientes = 4 años, boca llena = 5+ años. También se puede calcular desde la fecha de nacimiento si está registrada en el sistema.",
          },
          {
            pregunta: "¿Qué hacer ante un caso de diarrea neonatal?",
            respuesta: "Aislar al ternero, hidratar con suero oral (1L agua + 3g sal + 20g azúcar + 1g bicarbonato), administrar antibiótico de amplio espectro y mantener limpio el área. Si hay sangre o fiebre alta, llamar al veterinario urgente.",
          },
        ],
      },
    });
  } catch (error) {
    logger.error("Error en resumen consultor:", error);
    throw new AppError("Error obteniendo resumen del consultor", "FETCH_ERROR", 500);
  }
});

export default consultorRoutes;
