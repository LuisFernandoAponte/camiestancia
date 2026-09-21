import { Hono } from "hono";
import { pool } from "@/db/index.js";
import { getCurrentUser } from "@/lib/jwt.js";
import { AppError } from "@/lib/errors.js";
import logger from "@/utils/logger.js";

export const whatsappRoutes = new Hono();

/**
 * GET /api/whatsapp/mensajes
 * Genera mensajes inteligentes para WhatsApp basados en datos reales del hato
 */
async function getConfigPhone(): Promise<string> {
  try {
    const r = await pool.query("SELECT valor FROM configuracion WHERE clave = $1", ["whatsapp_phone"]);
    if (r.rows.length > 0 && r.rows[0].valor) return r.rows[0].valor;
  } catch {}
  return "";
}

whatsappRoutes.get("/plantillas", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);
  return c.json({
    success: true,
    data: [
      { id: "p1", titulo: "Alerta de Parto", plantilla: "Hola, el animal {animal} ({chip}) tiene fecha estimada de parto para el {fecha}." },
      { id: "p2", titulo: "Vacunación Pendiente", plantilla: "Recordatorio: Se requiere aplicar {tipo} al animal {animal} ({chip})." },
      { id: "p3", titulo: "Confirmación de Venta", plantilla: "Estimado/a {comprador}, se registra la venta del animal {animal} por el valor de ${precio}." },
    ],
  });
});

whatsappRoutes.get("/mensajes", async (c) => {

  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);

  try {
    const configTel = await getConfigPhone();
    const tel = (fallback: string) => configTel || fallback;

    const mensajes: {
      id: string;
      tipo: string;
      prioridad: string;
      icono: string;
      animal: string;
      chip: string;
      mensaje: string;
      mensajeCorto: string;
      destinatario: string;
      telefono: string;
      fecha: string | null;
      contexto: string;
      accion: string;
    }[] = [];

    const hoy = new Date();
    const f = (d: Date) => d.toLocaleDateString("es-BO", { day: "2-digit", month: "2-digit", year: "numeric" });

    /* ── Partos próximos (≤30 días) ── */
    const partos = await pool.query(`
      SELECT r.id, b.nombre, b.chip, r.parto_estimado, r.dias_gestacion, b.raza, b.potrero
      FROM reproduccion r JOIN bovinos b ON b.id = r.hembra_id
      WHERE r.estado IN ('confirmada','evaluacion')
      AND r.parto_estimado BETWEEN CURRENT_DATE AND CURRENT_DATE + 30
      ORDER BY r.parto_estimado
    `).then(r => r.rows);

    for (const p of partos) {
      const nombre = p.nombre || "Sin nombre";
      const chip = p.chip || "—";
      const estimado = p.parto_estimado ? f(new Date(p.parto_estimado)) : "—";
      const gestacion = p.dias_gestacion ?? "—";
      const msg = `🐮 *PARTO PRÓXIMO* - ${nombre} (${chip})
📅 Fecha estimada: ${estimado}
⏱ Gestación: ${gestacion} días
📍 Potrero: ${p.potrero || "—"} | Raza: ${p.raza || "—"}

✅ Acciones recomendadas:
• Monitorear signos preparto cada 6 h
• Preparar kit de parto (yodo, oxitocina, guantes, vendas)
• Asegurar potrero limpio y seco
• Tener contacto del veterinario de guardia

⚠️ Signos de alerta:
• Más de 4 h sin expulsión → llamar al veterinario
• Placenta retenida >12 h → aplicar oxitocina`;

      mensajes.push({
        id: `parto-${p.id}`,
        tipo: "Parto próximo",
        prioridad: "alta",
        icono: "🐮",
        animal: nombre,
        chip,
        mensaje: msg,
        mensajeCorto: `Recordatorio: parto estimado de ${nombre} (${chip}) el ${estimado}. Gestación: ${gestacion} días.`,
        destinatario: "Encargado de partos",
        telefono: tel("59170000001"),
        fecha: p.parto_estimado,
        contexto: `${gestacion} días de gestación · Raza: ${p.raza || "—"} · Potrero: ${p.potrero || "—"}`,
        accion: "Monitorear signos preparto cada 6 horas. Preparar kit de parto.",
      });
    }

    /* ── Partos inminentes (≥260 días) ── */
    const inminentes = await pool.query(`
      SELECT r.id, b.nombre, b.chip, r.parto_estimado, r.dias_gestacion
      FROM reproduccion r JOIN bovinos b ON b.id = r.hembra_id
      WHERE r.estado IN ('confirmada','evaluacion')
      AND r.dias_gestacion >= 260
      ORDER BY r.dias_gestacion DESC
    `).then(r => r.rows);

    for (const p of inminentes) {
      if (partos.some((x: any) => x.id === p.id)) continue;
      const nombre = p.nombre || "Sin nombre";
      const chip = p.chip || "—";
      const estimado = p.parto_estimado ? f(new Date(p.parto_estimado)) : "—";
      const msg = `🚨 *URGENTE - PARTO INMINENTE* - ${nombre} (${chip})
⏱ Gestación: ${p.dias_gestacion} días
📅 Parto estimado: ${estimado}

🔴 Recomendación inmediata:
• Asignar personal para monitoreo 24h
• Tener lista instalación de parto
• Preparar suero, oxitocina y antibiótico
• Contactar veterinario de emergencia: +591 700 00000`;

      mensajes.push({
        id: `inminente-${p.id}`,
        tipo: "Parto inminente",
        prioridad: "urgente",
        icono: "🚨",
        animal: nombre,
        chip,
        mensaje: msg,
        mensajeCorto: `⚠️ PARTO INMINENTE: ${nombre} (${chip}) con ${p.dias_gestacion} días de gestación. Monitoreo urgente.`,
        destinatario: "Veterinario",
        telefono: tel("59170000002"),
        fecha: p.parto_estimado,
        contexto: `${p.dias_gestacion} días de gestación · Requiere monitoreo 24h`,
        accion: "Asignar personal para monitoreo continuo. Preparar kit de emergencia.",
      });
    }

    /* ── Vacunas próximas (≤7 días) ── */
    const vacunas = await pool.query(`
      SELECT s.id, b.nombre, b.chip, s.proxima_fecha, s.notas, s.tipo
      FROM salud s JOIN bovinos b ON b.id = s.animal_id
      WHERE s.tipo = 'vacuna' AND s.estado = 'pendiente'
      AND s.proxima_fecha BETWEEN CURRENT_DATE AND CURRENT_DATE + 7
      ORDER BY s.proxima_fecha
    `).then(r => r.rows);

    for (const v of vacunas) {
      const nombre = v.nombre || "Sin nombre";
      const chip = v.chip || "—";
      const prox = v.proxima_fecha ? f(new Date(v.proxima_fecha)) : "—";
      const tipoVacuna = v.notas || "vacuna rutinaria";
      const msg = `💉 *VACUNA PROGRAMADA* - ${nombre} (${chip})
📅 Fecha: ${prox}
💊 Tipo: ${tipoVacuna}

✅ Preparación:
• Revisar disponibilidad de dosis y agujas
• Verificar cadena de frío (2-8°C)
• Tener planilla SENASAG actualizada
• Preparar área de trabajo (cingulo, jeringa, algodón)

📋 Registro obligatorio:
• Peso del animal
• Lote y dosis aplicada
• Firma del responsable`;

      mensajes.push({
        id: `vacuna-${v.id}`,
        tipo: "Vacuna programada",
        prioridad: "alta",
        icono: "💉",
        animal: nombre,
        chip,
        mensaje: msg,
        mensajeCorto: `Próxima vacuna de ${nombre} (${chip}) el ${prox}: ${tipoVacuna}.`,
        destinatario: "Veterinario",
        telefono: tel("59171234567"),
        fecha: v.proxima_fecha,
        contexto: `${tipoVacuna} · Revisar cadena de frío y planilla SENASAG`,
        accion: "Preparar dosis, agujas y planilla SENASAG. Verificar cadena de frío.",
      });
    }

    /* ── Desparasitaciones pendientes (≤30 días) ── */
    const desparas = await pool.query(`
      SELECT s.id, b.nombre, b.chip, s.proxima_fecha, s.notas
      FROM salud s JOIN bovinos b ON b.id = s.animal_id
      WHERE s.tipo = 'desparasitacion' AND s.estado = 'pendiente'
      AND (s.proxima_fecha IS NULL OR s.proxima_fecha <= CURRENT_DATE + 30)
      ORDER BY s.proxima_fecha NULLS LAST
    `).then(r => r.rows);

    for (const d of desparas) {
      const nombre = d.nombre || "Sin nombre";
      const chip = d.chip || "—";
      const prox = d.proxima_fecha ? f(new Date(d.proxima_fecha)) : "Sin fecha asignada";
      const msg = `🪱 *DESPARASITACIÓN PENDIENTE* - ${nombre} (${chip})
📅 Programada: ${prox}
📝 Notas: ${d.notas || "—"}

✅ Recomendación:
• Alternar principios activos (Ivermectina ↔ Albendazol)
• Pesar animal antes de dosificar
• Rotar potreros post-aplicación
• Registrar producto y dosis aplicada`;

      mensajes.push({
        id: `despara-${d.id}`,
        tipo: "Desparasitación",
        prioridad: "media",
        icono: "🪱",
        animal: nombre,
        chip,
        mensaje: msg,
        mensajeCorto: `Desparasitación pendiente para ${nombre} (${chip}) - ${prox}. Recordar alternar principio activo.`,
        destinatario: "Gestor de campo",
        telefono: tel("59172345678"),
        fecha: d.proxima_fecha,
        contexto: d.notas ? `Notas: ${d.notas}` : "Desparasitación rutinaria",
        accion: "Aplicar desparasitante. Alternar principio activo. Rotar potrero.",
      });
    }

    /* ── Chequeos pendientes ── */
    const chequeos = await pool.query(`
      SELECT s.id, b.nombre, b.chip, s.proxima_fecha, s.notas
      FROM salud s JOIN bovinos b ON b.id = s.animal_id
      WHERE s.tipo = 'chequeo' AND s.estado = 'pendiente'
      ORDER BY s.proxima_fecha NULLS LAST
    `).then(r => r.rows);

    for (const c of chequeos) {
      const nombre = c.nombre || "Sin nombre";
      const chip = c.chip || "—";
      const prox = c.proxima_fecha ? f(new Date(c.proxima_fecha)) : "Sin fecha";
      const msg = `🔍 *CHEQUEO PENDIENTE* - ${nombre} (${chip})
📅 Fecha: ${prox}
📝 Notas: ${c.notas || "—"}

✅ Preparación:
• Tener ecógrafo/listo para tacto rectal
• Preparar registros del animal
• Asegurar área de examen limpia
• Registrar resultados en el sistema`;

      mensajes.push({
        id: `chequeo-${c.id}`,
        tipo: "Chequeo pendiente",
        prioridad: "media",
        icono: "🔍",
        animal: nombre,
        chip,
        mensaje: msg,
        mensajeCorto: `Chequeo programado para ${nombre} (${chip}) el ${prox}. ${c.notas || ""}`,
        destinatario: "Veterinario",
        telefono: tel("59171234567"),
        fecha: c.proxima_fecha,
        contexto: c.notas || "Chequeo de rutina",
        accion: "Preparar equipo de examen. Revisar historial del animal.",
      });
    }

    /* ── Hembras disponibles para servicio ── */
    const hembrasServicio = await pool.query(`
      SELECT id, nombre, chip, raza, peso_actual, potrero
      FROM bovinos
      WHERE sexo = 'hembra' AND estado IN ('activo','disponible')
      AND id NOT IN (
        SELECT hembra_id FROM reproduccion
        WHERE estado IN ('confirmada','evaluacion')
        AND (dias_gestacion IS NULL OR dias_gestacion > 0)
      )
      ORDER BY nombre
    `).then(r => r.rows);

    for (const h of hembrasServicio) {
      const nombre = h.nombre || "Sin nombre";
      const chip = h.chip || "—";
      const msg = `🐂 *HEMBRA DISPONIBLE PARA SERVICIO* - ${nombre} (${chip})
📍 Potrero: ${h.potrero || "—"} | Raza: ${h.raza || "—"} | Peso: ${h.peso_actual || "—"}kg

✅ Próximos pasos:
• Detectar celo (observar 2 veces/día)
• Preparar pajilla de semen (raza: ${h.raza || "—"})
• Tener listo equipo de inseminación
• Registrar servicio en el sistema
• Programar diagnóstico de preñez a los 35 días`;

      mensajes.push({
        id: `servicio-${h.id}`,
        tipo: "Hembra para servicio",
        prioridad: "media",
        icono: "🐂",
        animal: nombre,
        chip,
        mensaje: msg,
        mensajeCorto: `${nombre} (${chip}) está disponible para servicio. Detectar celo e inseminar.`,
        destinatario: "Inseminador",
        telefono: tel("59173456789"),
        fecha: null,
        contexto: `${h.raza || "—"} · ${h.peso_actual || "—"}kg · Potrero: ${h.potrero || "—"}`,
        accion: "Detectar celo 2 veces/día. Preparar pajilla y equipo de inseminación.",
      });
    }

    /* ── Pérdida de peso detectada ── */
    const perdidaPeso = await pool.query(`
      SELECT id, nombre, chip, peso_actual, peso_inicial, raza, potrero,
        ROUND((1 - peso_actual::numeric / peso_inicial::numeric) * 100, 1)::float AS perdido_pct
      FROM bovinos
      WHERE peso_actual IS NOT NULL AND peso_inicial IS NOT NULL
      AND peso_actual < peso_inicial * 0.95 AND estado = 'activo'
      ORDER BY perdido_pct DESC
      LIMIT 10
    `).then(r => r.rows);

    for (const p of perdidaPeso) {
      const nombre = p.nombre || "Sin nombre";
      const chip = p.chip || "—";
      const msg = `📉 *ALERTA NUTRICIÓN* - ${nombre} (${chip})
⚠️ Perdió el ${p.perdido_pct}% de peso
⚖️ Peso inicial: ${p.peso_inicial}kg → Actual: ${p.peso_actual}kg
📍 Potrero: ${p.potrero || "—"} | Raza: ${p.raza || "—"}

✅ Acciones:
• Revisar calidad y cantidad de forraje
• Suplementar con sales mineralizadas
• Evaluar carga animal del potrero
• Descartar enfermedades parasitarias
• Registrar nuevo peso en 15 días`;

      mensajes.push({
        id: `peso-${p.id}`,
        tipo: "Pérdida de peso",
        prioridad: "alta",
        icono: "📉",
        animal: nombre,
        chip,
        mensaje: msg,
        mensajeCorto: `${nombre} (${chip}) perdió ${p.perdido_pct}% de peso (${p.peso_inicial}→${p.peso_actual}kg). Revisar alimentación.`,
        destinatario: "Nutricionista",
        telefono: tel("59174567890"),
        fecha: null,
        contexto: `Perdió ${p.perdido_pct}% · ${p.peso_inicial}→${p.peso_actual}kg · ${p.raza || "—"}`,
        accion: "Evaluar forraje y suplementación. Descartar parásitos. Repesar en 15 días.",
      });
    }

    /* ── Ordenar por prioridad ── */
    const prioridadOrder: Record<string, number> = { urgente: 0, alta: 1, media: 2, baja: 3 };
    mensajes.sort((a, b) => (prioridadOrder[a.prioridad] ?? 9) - (prioridadOrder[b.prioridad] ?? 9));

    /* ── Estadísticas ── */
    const stats = {
      total: mensajes.length,
      urgentes: mensajes.filter(m => m.prioridad === "urgente").length,
      altas: mensajes.filter(m => m.prioridad === "alta").length,
      medias: mensajes.filter(m => m.prioridad === "media").length,
      bajas: mensajes.filter(m => m.prioridad === "baja").length,
      porTipo: Object.entries(
        mensajes.reduce((acc, m) => {
          acc[m.tipo] = (acc[m.tipo] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      ).map(([tipo, count]) => ({ tipo, count })),
    };

    return c.json({
      success: true,
      data: { mensajes, stats },
      meta: {
        generado: new Date().toISOString(),
        fuente: "datos reales del hato",
      },
    });
  } catch (error) {
    logger.error("Error generando mensajes WhatsApp:", error);
    throw new AppError("Error generando mensajes", "FETCH_ERROR", 500);
  }
});

export default whatsappRoutes;
