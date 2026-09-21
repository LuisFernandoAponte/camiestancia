 import db from "./index.js"
import { usuarios, bovinos, salud, reproduccion, finanzas } from "./schema.js";
import bcrypt from "bcrypt";
import { sql } from "drizzle-orm";

/**
 * Limpia todas las tablas
 */
async function clearTables() {
  console.log("🧹 Limpiando tablas...");
  await db.execute(sql`TRUNCATE TABLE reproduccion CASCADE`);
  await db.execute(sql`TRUNCATE TABLE salud CASCADE`);
  await db.execute(sql`TRUNCATE TABLE bovinos CASCADE`);
  await db.execute(sql`TRUNCATE TABLE usuarios CASCADE`);
  await db.execute(sql`TRUNCATE TABLE finanzas CASCADE`);
}

/**
 * Seed inicial con datos de prueba
 */
async function seedDatabase() {
  try {
    console.log("🌱 Iniciando seed de base de datos...");

    await clearTables();

    // ========== CONSULTOR REGLAS ==========
    console.log("📋 Creando tabla consultor_reglas...");
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS consultor_reglas (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          categoria VARCHAR(30) NOT NULL,
          prioridad VARCHAR(10) DEFAULT 'media',
          condicion_sql TEXT NOT NULL,
          mensaje_alerta TEXT NOT NULL,
          recomendacion TEXT,
          activo BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } catch (e) {
      console.warn("⚠️ No se pudo crear consultor_reglas (quizás ya existe). Continuando...");
    }

    try {
      await db.execute(sql`DELETE FROM consultor_reglas`);
      await db.execute(sql`
        INSERT INTO consultor_reglas (categoria, prioridad, condicion_sql, mensaje_alerta, recomendacion) VALUES
          ('salud', 'alta',
           'SELECT 1 FROM salud s WHERE s.tipo = ''vacuna'' AND s.estado = ''pendiente'' AND s.proxima_fecha <= CURRENT_DATE + 7',
           '⚠️ Vacuna pendiente en 7 días',
           'Programar aplicación de vacuna contra aftosa o carbunclo según calendario SENASAG.'),
          ('salud', 'alta',
           'SELECT 1 FROM bovinos b WHERE b.potrero ILIKE ''%humedo%'' AND b.estado = ''activo'' AND EXTRACT(MONTH FROM CURRENT_DATE) IN (12,1,2,3)',
           '🌧️ Riesgo de parasitosis en época de lluvias',
           'Aplicar desparasitante estratégico (Ivermectina + Albendazol) y rotar potreros.'),
          ('reproduccion', 'alta',
           'SELECT 1 FROM reproduccion r WHERE r.dias_gestacion > 270 AND r.estado IN (''confirmada'', ''evaluacion'')',
           '🐮 Parto inminente (≥270 días)',
           'Monitorear signos de parto: inquietud, ubre llena, separación del hato. Tener kit de asistencia listo.'),
          ('reproduccion', 'media',
           'SELECT 1 FROM reproduccion r WHERE r.fecha_inseminacion IS NOT NULL AND r.estado = ''confirmada'' AND CURRENT_DATE - r.fecha_inseminacion > 45 AND NOT EXISTS (SELECT 1 FROM salud s WHERE s.animal_id = r.hembra_id AND s.tipo = ''chequeo'' AND s.fecha > r.fecha_inseminacion + 30)',
           '🔍 Sin diagnóstico de preñez post-inseminación',
           'Programar ecografía o tacto rectal para confirmar preñez y descartar embriones tempranos.'),
          ('nutricion', 'media',
           'SELECT 1 FROM bovinos b WHERE b.peso_actual IS NOT NULL AND b.peso_inicial IS NOT NULL AND b.peso_actual < b.peso_inicial * 0.95 AND b.estado = ''activo''',
           '📉 Pérdida de peso detectada',
           'Revisar calidad de forraje, suplementar con sales mineralizadas y evaluar carga animal por hectárea.'),
          ('clima', 'baja',
           'SELECT 1 FROM bovinos b WHERE b.potrero ILIKE ''%norte%'' AND EXTRACT(MONTH FROM CURRENT_DATE) IN (9,10,11)',
           '☀️ Época seca: riesgo de estrés calórico',
           'Asegurar sombra natural/artificial y acceso permanente a agua limpia. Evitar manejo en horas pico de calor.')
      `);
      console.log("✅ consultor_reglas listas (6 reglas insertadas)");
    } catch (e) {
      console.warn("⚠️ No se pudieron insertar reglas de consultor (tabla no existe). Seed continuará sin ellas.");
    }

    // ========== USUARIOS ==========
    console.log("👤 Insertando usuarios...");
    const hashedPassword = await bcrypt.hash("AdminPass123!", 10);

    const usuariosInsertados = await db
      .insert(usuarios)
      .values([
        { email: "admin@laestancia.com", passwordHash: hashedPassword, rol: "admin" },
        { email: "gestor@laestancia.com", passwordHash: hashedPassword, rol: "gestor" },
        { email: "vet@laestancia.com", passwordHash: hashedPassword, rol: "veterinario" },
      ])
      .returning();

    // ========== BOVINOS ==========
    console.log("🐄 Insertando bovinos...");
    const bovinosInsertados = await db
      .insert(bovinos)
      .values([
        {
          chip: "BO-7710-001",
          nombre: "Imperador",
          raza: "Nelore PO",
          sexo: "Macho",
          nacimiento: new Date("2021-03-12"),
          pesoInicial: "32",
          pesoActual: "780",
          potrero: "Norte-A",
          estado: "disponible",
          precio: "4200",
        },
        {
          chip: "BO-7710-002",
          nombre: "Estrela",
          raza: "Brahman",
          sexo: "Hembra",
          nacimiento: new Date("2022-06-08"),
          pesoInicial: "28",
          pesoActual: "510",
          potrero: "Sur-B",
          estado: "preñez",
        },
        {
          chip: "BO-7710-003",
          nombre: "Trovão",
          raza: "Nelore",
          sexo: "Macho",
          nacimiento: new Date("2020-11-20"),
          pesoInicial: "30",
          pesoActual: "920",
          potrero: "Norte-C",
          estado: "disponible",
          precio: "5100",
        },
        {
          chip: "BO-7710-004",
          nombre: "Aurora",
          raza: "Gyr Lechero",
          sexo: "Hembra",
          nacimiento: new Date("2023-01-15"),
          pesoInicial: "26",
          pesoActual: "380",
          potrero: "Este-A",
          estado: "cuarentena",
        },
        {
          chip: "BO-7710-005",
          nombre: "Sertão",
          raza: "Brahman",
          sexo: "Macho",
          nacimiento: new Date("2021-08-30"),
          pesoInicial: "31",
          pesoActual: "690",
          potrero: "Sur-A",
          estado: "vendido",
        },
        {
          chip: "BO-7710-006",
          nombre: "Luna",
          raza: "Nelore PO",
          sexo: "Hembra",
          nacimiento: new Date("2022-12-02"),
          pesoInicial: "27",
          pesoActual: "450",
          potrero: "Este-B",
          estado: "disponible",
          precio: "3800",
        },
        {
          chip: "BO-7710-007",
          nombre: "Caudilho",
          raza: "Brangus",
          sexo: "Macho",
          nacimiento: new Date("2020-05-18"),
          pesoInicial: "33",
          pesoActual: "1010",
          potrero: "Norte-A",
          estado: "disponible",
          precio: "5600",
        },
        {
          chip: "BO-7710-008",
          nombre: "Manaca",
          raza: "Nelore",
          sexo: "Hembra",
          nacimiento: new Date("2023-04-22"),
          pesoInicial: "25",
          pesoActual: "320",
          potrero: "Sur-C",
          estado: "preñez",
        },
      ])
      .returning();

    // ========== SALUD ==========
    console.log("💉 Insertando eventos de salud...");
    await db.insert(salud).values([
      {
        animalId: bovinosInsertados[0].id,
        tipo: "vacuna",
        fecha: new Date("2026-05-10"),
        proximaFecha: new Date("2026-11-10"),
        veterinario: "Dr. Mendoza",
        estado: "aplicado",
      },
      {
        animalId: bovinosInsertados[3].id,
        tipo: "desparasitacion",
        fecha: new Date("2026-05-18"),
        proximaFecha: new Date("2026-08-18"),
        veterinario: "Dra. Rivero",
        estado: "aplicado",
      },
      {
        animalId: bovinosInsertados[1].id,
        tipo: "chequeo",
        fecha: new Date("2026-05-20"),
        proximaFecha: new Date("2026-06-20"),
        veterinario: "Dr. Mendoza",
        estado: "pendiente",
      },
      {
        animalId: bovinosInsertados[7].id,
        tipo: "vacuna",
        fecha: new Date("2026-04-30"),
        proximaFecha: new Date("2026-10-30"),
        veterinario: "Dra. Rivero",
        estado: "aplicado",
      },
      {
        animalId: bovinosInsertados[5].id,
        tipo: "desparasitacion",
        fecha: new Date("2026-05-25"),
        proximaFecha: new Date("2026-08-25"),
        veterinario: "Dr. Mendoza",
        estado: "pendiente",
      },
    ]);

    // ========== REPRODUCCIÓN ==========
    console.log("👶 Insertando registros de reproducción...");
    await db.insert(reproduccion).values([
      {
        hembraId: bovinosInsertados[1].id,
        padreId: bovinosInsertados[0].id,
        fechaInseminacion: new Date("2025-12-15").toISOString(),
        diasGestacion: 157,
        partoEstimado: new Date("2026-09-21").toISOString(),
        estado: "confirmada",
      },
      {
        hembraId: bovinosInsertados[7].id,
        padreId: bovinosInsertados[6].id,
        fechaInseminacion: new Date("2026-01-20").toISOString(),
        diasGestacion: 121,
        partoEstimado: new Date("2026-10-27").toISOString(),
        estado: "confirmada",
      },
      {
        hembraId: bovinosInsertados[5].id,
        padreId: bovinosInsertados[2].id,
        fechaInseminacion: new Date("2026-05-02").toISOString(),
        diasGestacion: 19,
        partoEstimado: new Date("2027-02-06").toISOString(),
        estado: "evaluacion",
      },
    ]);

    // ========== FINANZAS ==========
    console.log("💰 Insertando datos financieros...");
    await db.insert(finanzas).values([
      { lote: "Lote A", mes: 1, anio: 2026, ingresos: "45000", egresos: "18000" },
      { lote: "Lote B", mes: 1, anio: 2026, ingresos: "38000", egresos: "16500" },
      { lote: "Lote A", mes: 2, anio: 2026, ingresos: "52000", egresos: "19500" },
      { lote: "Lote B", mes: 2, anio: 2026, ingresos: "41000", egresos: "17200" },
      { lote: "Lote A", mes: 3, anio: 2026, ingresos: "48500", egresos: "19000" },
      { lote: "Lote B", mes: 3, anio: 2026, ingresos: "39500", egresos: "16800" },
      { lote: "Lote A", mes: 4, anio: 2026, ingresos: "55000", egresos: "20000" },
      { lote: "Lote B", mes: 4, anio: 2026, ingresos: "43000", egresos: "17500" },
      { lote: "Lote A", mes: 5, anio: 2026, ingresos: "58200", egresos: "21000" },
      { lote: "Lote B", mes: 5, anio: 2026, ingresos: "44250", egresos: "18100" },
    ]);

    console.log("✅ Seed completado exitosamente!");
    console.log(
      "📝 Credenciales de prueba: admin@laestancia.com / AdminPass123!",
    );
  } catch (error) {
    console.error("❌ Error en seed:", error);
    throw error;
  }
}

// Ejecutar seed
seedDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error fatal:", error);
    process.exit(1);
  });
