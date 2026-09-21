import db from "./index.js";
import { bovinos, salud, reproduccion, finanzas, gastos, ventas, insumos, usuarios } from "./schema.js";
import { sql, eq } from "drizzle-orm";

const RAZAS = ["Nelore", "Brahman", "Gyr", "Brangus", "Hereford", "Aberdeen Angus", "Simmental", "Charolais"];
const POTREROS = ["Norte-A", "Norte-B", "Sur-A", "Sur-B", "Este-A", "Este-B", "Oeste-A", "Oeste-B", "Central", "Quebrada"];
const VETERINARIOS = ["Dr. Mendoza", "Dra. Rivero", "Dr. Quispe", "Dra. Vargas", "Dr. Morales"];
const PROVEEDORES = ["Agrovet Santa Cruz", "Farmacia Veterinaria Bolívar", "Distribuidora Ganadera El Cerrado", "Insumos Pecuarios Ltda.", "Lab. Veterinario del Sur"];

const NOMBRES_MACHO = [
  "Imperador", "Trovão", "Sertão", "Caudilho", "Guardião", "Tornado", "Bravo", "Rex", "Titan", "Fury",
  "Relâmpago", "Vulcão", "Falcão", "Touro", "Garantia", "King", "Thor", "Apache", "Matador", "Corsário",
  "Cacique", "Mandioca", "Gaúcho", "Pampa", "Querência", "Bagual", "Índio", "Xamã", "Guerreiro", "Vendaval",
];
const NOMBRES_HEMBRA = [
  "Estrela", "Aurora", "Luna", "Manaca", "Morena", "Princesa", "Pérola", "Diamante", "Flor", "Safira",
  "Brisa", "Céu", "Doçura", "Esmeralda", "Felicidade", "Gaivota", "Harmonia", "Ilusão", "Jade", "Kiara",
  "Lavanda", "Margarida", "Nuvem", "Orquídea", "Paz", "Rainha", "Sereia", "Terra", "Uva", "Vitória",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function formatChip(index: number): string {
  const prefix = pick(["BO", "SC", "LP", "CB", "CH", "PO", "BE", "OR"]);
  const num = String(index + 1).padStart(4, "0");
  return `${prefix}-7710-${num}`;
}

function generatePesoInicial(): number {
  return randBetween(22, 38) + Math.round(Math.random() * 10) / 10;
}

function generatePesoActual(sexo: string, estado: string, pesoInicial: number): number {
  if (estado === "fallecido") return pesoInicial;
  const factor = 1 + randBetween(5, 35) / 100;
  return Math.round(pesoInicial * factor * 10) / 10;
}

function generateDate(startYear: number, endYear: number): Date {
  const start = new Date(`${startYear}-01-01`).getTime();
  const end = new Date(`${endYear}-12-31`).getTime();
  return new Date(start + Math.random() * (end - start));
}

async function seed() {
  try {
    console.log("🌱 Sembrando datos realistas...\n");

    const [adminUser] = await db.select().from(usuarios).where(eq(usuarios.email, "admin@laestancia.com")).limit(1);

    // ========== BOVINOS ==========
    console.log("🐄 Generando 50 bovinos...");
    const bovinosData: (typeof bovinos.$inferInsert)[] = [];
    const sexos: string[] = [];
    const estados: string[] = [];

    const distribuciónEstados = [
      { estado: "disponible", count: 16 },
      { estado: "activo", count: 18 },
      { estado: "preñez", count: 7 },
      { estado: "vendido", count: 4 },
      { estado: "cuarentena", count: 3 },
      { estado: "fallecido", count: 2 },
    ];

    const estadoDist: string[] = [];
    for (const d of distribuciónEstados) {
      for (let i = 0; i < d.count; i++) estadoDist.push(d.estado);
    }

    for (let i = 0; i < 50; i++) {
      const sexo = i < 25 ? "Macho" : "Hembra";
      const estado = estadoDist[i];
      const pesoInicial = generatePesoInicial();
      const pesoActual = generatePesoActual(sexo, estado, pesoInicial);
      const nombre = sexo === "Macho" ? NOMBRES_MACHO[i % NOMBRES_MACHO.length] : NOMBRES_HEMBRA[i % NOMBRES_HEMBRA.length];
      const raza = pick(RAZAS);
      const potrero = pick(POTREROS);
      const nacimiento = generateDate(2020, 2024);
      const precio = estado === "disponible" || estado === "vendido" ? randBetween(2500, 8000) : 0;

      bovinosData.push({
        chip: formatChip(i),
        nombre,
        raza,
        sexo,
        nacimiento,
        pesoInicial: String(pesoInicial),
        pesoActual: String(pesoActual),
        potrero,
        estado: estado as any,
        precio: String(precio),
      });
      sexos.push(sexo);
      estados.push(estado);
    }

    const bovinosInsertados = await db.insert(bovinos).values(bovinosData).returning();
    const bovinosMap = bovinosInsertados.map((b, i) => ({ ...b, estadoReal: estados[i], sexo: sexos[i] }));
    console.log(`  ✅ ${bovinosInsertados.length} bovinos insertados\n`);

    // ========== VENTAS (para los vendidos) ==========
    const vendidos = bovinosMap.filter((b) => b.estadoReal === "vendido");
    if (vendidos.length > 0) {
      console.log("💰 Insertando ventas...");
      const compradores = [
        { nombre: "Hernán Suárez", doc: "4523671 SC", tel: "+591 77123456", email: "hsuarez@email.com", finca: "Santa María" },
        { nombre: "Ricardo López", doc: "3321890 LP", tel: "+591 71234567", email: "rlopez@email.com", finca: "San José" },
        { nombre: "Marcelo Pinto", doc: "6134522 CH", tel: "+591 72223344", email: "mpinto@email.com", finca: "El Cerrado" },
        { nombre: "Carmen Rojas", doc: "2845610 SC", tel: "+591 73445566", email: "crojas@email.com", finca: "Nueva Esperanza" },
      ];
      for (let i = 0; i < vendidos.length; i++) {
        const c = compradores[i % compradores.length];
        const precioVenta = randBetween(3500, 8500);
        await db.insert(ventas).values({
          idempotencyKey: `venta-${vendidos[i].chip}`,
          animalId: vendidos[i].id,
          compradorNombre: c.nombre,
          compradorDocumento: c.doc,
          compradorTelefono: c.tel,
          compradorEmail: c.email,
          compradorFinca: c.finca,
          fechaVenta: new Date(2025, randBetween(0, 11), randBetween(1, 28)).toISOString().split("T")[0],
          precioVenta: String(precioVenta),
          metodoPago: pick(["efectivo", "transferencia", "cheque", "qr"]),
          estadoPago: "pagado",
          referenciaContrato: `CT-${2025}-${String(randBetween(100, 999))}`,
          notas: `Venta de ${vendidos[i].nombre} (chip ${vendidos[i].chip})`,
        });
      }
      console.log(`  ✅ ${vendidos.length} ventas registradas\n`);
    }

    // ========== SALUD ==========
    console.log("💉 Insertando eventos de salud...");
    const activosSalud = bovinosMap.filter((b) => b.estadoReal !== "fallecido");
    const saludData: (typeof salud.$inferInsert)[] = [];

    const TIPOS_SALUD = ["vacuna", "desparasitacion", "chequeo", "tratamiento"] as const;
    const NOTAS: Record<string, string[]> = {
      vacuna: ["Aftosa", "Carbunclo", "Brucelosis", "Rabia", "IBR"],
      desparasitacion: ["Ivermectina 1%", "Albendazol", "Levamisol", "Closantel", "Doramectina"],
      chequeo: ["Control rutinario", "Revisión post-tratamiento", "Evaluación pre-venta", "Control de peso"],
      tratamiento: ["Neumonía", "Pododermatitis", "Mastitis", "Queratoconjuntivitis", "Onfaloflebite"],
    };

    for (let i = 0; i < 70; i++) {
      const b = activosSalud[Math.floor(Math.random() * activosSalud.length)];
      const tipo = pick(TIPOS_SALUD);
      const fecha = generateDate(2024, 2026);
      const proxFecha = new Date(fecha);
      if (i < 8) {
        proxFecha.setDate(new Date().getDate() + randBetween(1, 7));
      } else {
        proxFecha.setMonth(proxFecha.getMonth() + randBetween(3, 8));
      }
      const notasArr = NOTAS[tipo] || ["Sin observaciones"];

      saludData.push({
        animalId: b.id,
        tipo,
        fecha,
        proximaFecha: proxFecha,
        veterinario: pick(VETERINARIOS),
        estado: i < 8 ? "pendiente" : pick(["pendiente", "aplicado", "aplicado", "aplicado", "reprogramado"]),
        notas: pick(notasArr),
      });
    }

    await db.insert(salud).values(saludData);
    console.log(`  ✅ ${saludData.length} registros de salud\n`);

    // ========== REPRODUCCIÓN ==========
    console.log("👶 Insertando registros de reproducción...");
    const hembrasPreñez = bovinosMap.filter((b) => b.estadoReal === "preñez");
    const machosActivos = bovinosMap.filter((b) => b.sexo === "Macho" && b.estadoReal !== "vendido" && b.estadoReal !== "fallecido");
    const reproData: (typeof reproduccion.$inferInsert)[] = [];

    for (let i = 0; i < hembrasPreñez.length; i++) {
      const h = hembrasPreñez[i];
      let fechaIns: Date;
      let partoEst: Date;
      if (i < 3) {
        fechaIns = new Date();
        fechaIns.setDate(fechaIns.getDate() - randBetween(272, 282));
        partoEst = new Date(fechaIns);
        partoEst.setDate(partoEst.getDate() + 283);
      } else {
        fechaIns = generateDate(2025, 2026);
        partoEst = new Date(fechaIns);
        partoEst.setDate(partoEst.getDate() + randBetween(275, 283));
      }
      const diffMs = partoEst.getTime() - fechaIns.getTime();
      const diasGest = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const padre = pick(machosActivos);

      reproData.push({
        hembraId: h.id,
        padreId: padre?.id || null,
        fechaInseminacion: fechaIns.toISOString(),
        diasGestacion: diasGest,
        partoEstimado: partoEst.toISOString(),
        estado: i < 2 ? "confirmada" : pick(["confirmada", "confirmada", "confirmada", "evaluacion"]),
      });
    }

    await db.insert(reproduccion).values(reproData);
    console.log(`  ✅ ${reproData.length} registros de reproducción\n`);

    // ========== FINANZAS ==========
    console.log("📊 Insertando datos financieros...");
    const LOTES = ["Lote A", "Lote B", "Lote C"];
    const finanzasData: (typeof finanzas.$inferInsert)[] = [];

    for (const lote of LOTES) {
      for (let mes = 1; mes <= 12; mes++) {
        const anio = mes > 6 ? 2025 : 2026;
        const ingresos = randBetween(15000, 65000);
        const egresos = randBetween(8000, 28000);
        finanzasData.push({
          lote,
          mes,
          anio,
          ingresos: String(ingresos),
          egresos: String(egresos),
        });
      }
    }

    await db.insert(finanzas).values(finanzasData);
    console.log(`  ✅ ${finanzasData.length} registros financieros\n`);

    // ========== GASTOS ==========
    console.log("📝 Insertando gastos...");
    const CATEGORIAS: { code: string; label: string }[] = [
      { code: "remedios", label: "Remedios y veterinaria" },
      { code: "trabajador", label: "Personal y mano de obra" },
      { code: "alimentacion", label: "Alimentación y suplementos" },
      { code: "mantenimiento", label: "Mantenimiento e infraestructura" },
      { code: "transporte", label: "Transporte y fletes" },
      { code: "otros", label: "Servicios básicos y otros" },
    ];
    const DESCRIPCIONES: Record<string, string[]> = {
      remedios: ["Vacuna aftosa", "Desparasitante", "Antibiótico", "Consulta veterinaria", "Vitaminas"],
      trabajador: ["Salario mensual", "Jornal vaqueros", "Horas extra", "Aguinaldo", "Seguro social"],
      alimentacion: ["Sales minerales", "Balanceado", "Heno", "Melaza", "Núcleo proteico"],
      mantenimiento: ["Reparación de corral", "Mantenimiento de tranquera", "Arreglo de bebederos", "Cercas eléctricas", "Pintura de galpón"],
      transporte: ["Flete ganado", "Transporte de insumos", "Combustible", "Viaje a feria", "Mantenimiento vehículo"],
      otros: ["Electricidad", "Agua potable", "Internet rural", "Teléfono", "Seguro"],
    };
    const MONTHS = new Date().getMonth() + 1;
    const YEAR = new Date().getFullYear();

    const gastosData: (typeof gastos.$inferInsert)[] = [];
    for (let i = 0; i < 120; i++) {
      const lote = pick(LOTES);
      const cat = pick(CATEGORIAS);
      const mes = i < 40 ? MONTHS : randBetween(1, 12);
      const anio = i < 40 ? YEAR : randBetween(YEAR - 1, YEAR);
      const descripcion = pick(DESCRIPCIONES[cat.code] || ["Gasto general"]);
      const monto = cat.code === "trabajador" ? randBetween(3000, 12000) :
                    cat.code === "alimentacion" || cat.code === "remedios" ? randBetween(800, 5000) :
                    randBetween(300, 3000);

      gastosData.push({ lote, mes, anio, categoria: cat.code, descripcion, monto: String(monto) });
    }

    await db.insert(gastos).values(gastosData);
    console.log(`  ✅ ${gastosData.length} gastos registrados\n`);

    // ========== INSUMOS ==========
    console.log("📦 Insertando insumos de inventario...");
    const insumosData: (typeof insumos.$inferInsert)[] = [
      { nombre: "Ivermectina 1%", tipo: "desparasitante", presentacion: "Frasco 250ml", stockActual: "12", stockMinimo: "5", unidad: "frascos", proveedor: "Agrovet Santa Cruz", costoUnitario: "185", fechaCompra: new Date("2025-10-15"), fechaVencimiento: new Date("2027-04-15") },
      { nombre: "Albendazol 10%", tipo: "desparasitante", presentacion: "Frasco 500ml", stockActual: "8", stockMinimo: "4", unidad: "frascos", proveedor: "Farmacia Veterinaria Bolívar", costoUnitario: "220", fechaCompra: new Date("2025-09-20"), fechaVencimiento: new Date("2027-03-20") },
      { nombre: "Vacuna Aftosa", tipo: "vacuna", presentacion: "Dosis 5ml", stockActual: "150", stockMinimo: "50", unidad: "dosis", proveedor: "Distribuidora Ganadera El Cerrado", costoUnitario: "18", fechaCompra: new Date("2026-01-10"), fechaVencimiento: new Date("2027-01-10") },
      { nombre: "Vacuna Carbunclo", tipo: "vacuna", presentacion: "Dosis 5ml", stockActual: "80", stockMinimo: "30", unidad: "dosis", proveedor: "Distribuidora Ganadera El Cerrado", costoUnitario: "22", fechaCompra: new Date("2026-02-05"), fechaVencimiento: new Date("2027-02-05") },
      { nombre: "Terramicina LA", tipo: "antibiotico", presentacion: "Frasco 100ml", stockActual: "6", stockMinimo: "3", unidad: "frascos", proveedor: "Insumos Pecuarios Ltda.", costoUnitario: "320", fechaCompra: new Date("2025-11-01"), fechaVencimiento: new Date("2026-11-01") },
      { nombre: "Penicilina Benzatínica", tipo: "antibiotico", presentacion: "Frasco 250ml", stockActual: "4", stockMinimo: "3", unidad: "frascos", proveedor: "Lab. Veterinario del Sur", costoUnitario: "280", fechaCompra: new Date("2025-12-15"), fechaVencimiento: new Date("2027-06-15") },
      { nombre: "Flunixin Meglumine", tipo: "antiinflamatorio", presentacion: "Frasco 50ml", stockActual: "3", stockMinimo: "2", unidad: "frascos", proveedor: "Agrovet Santa Cruz", costoUnitario: "195", fechaCompra: new Date("2026-03-20"), fechaVencimiento: new Date("2027-09-20") },
      { nombre: "Complejo B Veterinario", tipo: "vitamina", presentacion: "Frasco 100ml", stockActual: "10", stockMinimo: "3", unidad: "frascos", proveedor: "Farmacia Veterinaria Bolívar", costoUnitario: "145", fechaCompra: new Date("2025-08-25"), fechaVencimiento: new Date("2027-02-25") },
      { nombre: "Sales Minerales 40kg", tipo: "suplemento", presentacion: "Bolsa 40kg", stockActual: "20", stockMinimo: "10", unidad: "bolsas", proveedor: "Distribuidora Ganadera El Cerrado", costoUnitario: "380", fechaCompra: new Date("2026-04-01") },
      { nombre: "Núcleo Proteico 25kg", tipo: "suplemento", presentacion: "Bolsa 25kg", stockActual: "8", stockMinimo: "5", unidad: "bolsas", proveedor: "Insumos Pecuarios Ltda.", costoUnitario: "520", fechaCompra: new Date("2026-03-15") },
      { nombre: "Jeringa Automática 20ml", tipo: "herramienta", presentacion: "Unidad", stockActual: "5", stockMinimo: "3", unidad: "unidades", proveedor: "Agrovet Santa Cruz", costoUnitario: "450", fechaCompra: new Date("2025-07-10") },
      { nombre: "Agujas Descartables 40x16", tipo: "herramienta", presentacion: "Caja x100", stockActual: "3", stockMinimo: "2", unidad: "cajas", proveedor: "Farmacia Veterinaria Bolívar", costoUnitario: "120", fechaCompra: new Date("2025-06-20") },
      { nombre: "Arete Identificador", tipo: "herramienta", presentacion: "Bolsa x50 pares", stockActual: "2", stockMinimo: "2", unidad: "bolsas", proveedor: "Distribuidora Ganadera El Cerrado", costoUnitario: "350", fechaCompra: new Date("2025-09-05") },
      { nombre: "Curabicheras Spray", tipo: "otro", presentacion: "Atomizador 500ml", stockActual: "4", stockMinimo: "2", unidad: "unidades", proveedor: "Lab. Veterinario del Sur", costoUnitario: "95", fechaCompra: new Date("2026-01-20"), fechaVencimiento: new Date("2027-07-20") },
      { nombre: "Melaza 200L", tipo: "suplemento", presentacion: "Tambor 200L", stockActual: "2", stockMinimo: "1", unidad: "tambores", proveedor: "Distribuidora Ganadera El Cerrado", costoUnitario: "850", fechaCompra: new Date("2026-04-10") },
      { nombre: "Tópico Cicatrizante", tipo: "otro", presentacion: "Frasco 250ml", stockActual: "2", stockMinimo: "2", unidad: "frascos", proveedor: "Agrovet Santa Cruz", costoUnitario: "75", fechaCompra: new Date("2025-11-15"), fechaVencimiento: new Date("2027-05-15") },
    ];

    await db.insert(insumos).values(insumosData);
    console.log(`  ✅ ${insumosData.length} insumos registrados\n`);

    // ========== RESUMEN ==========
    const totales = await db.execute(sql`
      SELECT
        (SELECT COUNT(*) FROM bovinos) AS bovinos,
        (SELECT COUNT(*) FROM salud) AS salud,
        (SELECT COUNT(*) FROM reproduccion) AS reproduccion,
        (SELECT COUNT(*) FROM finanzas) AS finanzas,
        (SELECT COUNT(*) FROM gastos) AS gastos,
        (SELECT COUNT(*) FROM ventas) AS ventas,
        (SELECT COUNT(*) FROM insumos) AS insumos
    `);

    const r = totales.rows[0] as any;
    console.log("=".repeat(40));
    console.log("📊 RESUMEN DE CARGA");
    console.log("=".repeat(40));
    console.log(`  🐄 Bovinos:        ${r.bovinos}`);
    console.log(`  💉 Salud:          ${r.salud}`);
    console.log(`  👶 Reproducción:   ${r.reproduccion}`);
    console.log(`  📊 Finanzas:       ${r.finanzas}`);
    console.log(`  📝 Gastos:         ${r.gastos}`);
    console.log(`  💰 Ventas:         ${r.ventas}`);
    console.log(`  📦 Insumos:        ${r.insumos}`);
    console.log("=".repeat(40));
    console.log("✅ Seed completado exitosamente!");
    console.log("📝 Usuarios intactos para login.");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

seed();
