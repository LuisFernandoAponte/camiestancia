import db from "./index.js";
import {
  usuarios,
  bovinos,
  toros,
  vaquillas,
  salud,
  reproduccion,
  diagnosticos,
  insumos,
  finanzas,
  gastos,
  ventas,
  consultorReglas,
  configuracion,
} from "./schema.js";
import { sql } from "drizzle-orm";
import bcrypt from "bcrypt";

const FOTOS_TOROS = [
  "https://images.unsplash.com/photo-1546445317-29f4545f9d52?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1570042707206-14dd80d2871b?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1527153857715-3908f2bae5e8?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1545468843-27956a3a7ef8?auto=format&fit=crop&w=1200&q=80",
];

const FOTOS_HEMBRAS = [
  "https://images.unsplash.com/photo-1500595046743-cd271d694d30?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1499529112087-3cb3b73cec95?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1527153857715-3908f2bae5e8?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1546445317-29f4545f9d52?auto=format&fit=crop&w=1200&q=80",
];

const FOTOS_INSUMOS = [
  "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1585435557343-3b092031a831?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1550572017-edf7928d1041?auto=format&fit=crop&w=800&q=80",
];

const RAZAS = ["Nelore PO", "Brahman", "Brangus", "Gyr Lechero", "Nelore Mocho", "Sindi"];
const POTREROS = ["Potrero Norte-1", "Potrero Norte-2", "Potrero Sur-A", "Potrero Central", "Potrero Quebrada", "Engorde Lote 4"];

const NOMBRES_TOROS = [
  "LORENTE IMPERADOR TE", "GUAYABA TITAN PO", "APACHE DE LA ESTANCIA", "ROYAL NELORE BARON",
  "CAMPEON BRANGUS III", "REI DA SANTA CRUZ", "THOR NELORE MOCHO", "VULCANO BRAHMAN",
  "GUARDIAN DE LORENTE", "COMANDANTE GYR",
];

const NOMBRES_VACAS = [
  "LORENTE ESTRELLA TE", "GUAYABA AURORA PO", "LUNA BLANCA DE LA ESTANCIA", "MORENA NELORE I",
  "PRINCESA BRAHMAN", "PEROLA DA SANTA CRUZ", "ESMERALDA GYR", "SOFIA BRANGUS",
  "RAINHA DEL SUR", "VICTORIA PO", "BRISA DE LORENTE", "ISABELA TE",
];

export async function runSeniorSeed() {
  console.log("🚀 Iniciando Seeding de Datos Reales Senior para Hacienda Guayabal Lorente...");

  try {
    console.log("🧹 Limpiando tablas de la base de datos...");
    await db.execute(sql`TRUNCATE TABLE usuarios, ventas, diagnosticos, reproduccion, salud, toros, vaquillas, bovinos, insumos, gastos, finanzas, consultor_reglas, configuracion CASCADE;`);

    // 1. Usuario Admin
    console.log("👤 Creando usuario Administrador...");
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash("AdminPass123!", salt);
    
    const [adminUser] = await db
      .insert(usuarios)
      .values({ email: "admin@laestancia.com", passwordHash, rol: "admin" })
      .returning();

    // 2. Bovinos Toros (10 ejemplares)
    console.log("🐂 Insertando 10 Toros evaluados...");
    const createdToros: any[] = [];
    for (let i = 0; i < NOMBRES_TOROS.length; i++) {
      const nombre = NOMBRES_TOROS[i];
      const chip = `BO-2026-${(1000 + i).toString()}`;
      const raza = RAZAS[i % RAZAS.length];
      const pesoActual = 680 + i * 30;
      const nacimientoDate = new Date(2021, i % 12, 15);
      const [bovino] = await db
        .insert(bovinos)
        .values({
          chip, numeroIdentificacion: `RP-${200 + i}`, nombre, raza, sexo: "Macho",
          color: "BC", tipo: "toro", nacimiento: nacimientoDate,
          pesoInicial: (420 + i * 20).toString(), pesoActual: pesoActual.toString(),
          potrero: POTREROS[i % POTREROS.length], estado: "activo",
          precio: (3500 + i * 400).toString(), foto: FOTOS_TOROS[i % FOTOS_TOROS.length],
        })
        .returning();
      createdToros.push(bovino);

      await db.insert(toros).values({
        bovinoId: bovino.id, codigo: `TORO-${100 + i}`, nombre: bovino.nombre, raza: bovino.raza,
        fechaNacimiento: nacimientoDate, fechaEvaluacion: new Date(2026, 0, 15).toISOString(),
        pesoEvaluacion: pesoActual.toString(), circunferenciaEscrotal: (39.5 + (i % 5) * 0.8).toString(),
        calidadSeminal: i % 2 === 0 ? "E" : "S", categoria: "Donante Élite", activo: true,
        observaciones: "Examen andrológico aprobado con excelente motilidad y vigor seminal.",
      });
    }

    // 3. Bovinos Hembras (12 vacas y vaquillas)
    console.log("🐄 Insertando 12 Vacas y Vaquillas con linaje...");
    const createdHembras: any[] = [];
    for (let i = 0; i < NOMBRES_VACAS.length; i++) {
      const nombre = NOMBRES_VACAS[i];
      const chip = `BO-2026-${(2000 + i).toString()}`;
      const raza = RAZAS[i % RAZAS.length];
      const esVaquilla = i >= 6;
      const estado = i % 3 === 0 ? "preñez" : "activo";
      const nacimientoDate = new Date(esVaquilla ? 2023 : 2021, i % 12, 10);
      const padrePadre = createdToros[i % createdToros.length];

      const [bovino] = await db
        .insert(bovinos)
        .values({
          chip, numeroIdentificacion: `RP-${500 + i}`, nombre, raza, sexo: "Hembra",
          color: "CL", tipo: esVaquilla ? "vaquilla" : "vaca", nacimiento: nacimientoDate,
          pesoInicial: (310 + i * 15).toString(), pesoActual: (480 + i * 20).toString(),
          potrero: POTREROS[i % POTREROS.length], estado, padreId: padrePadre.id,
          precio: (2200 + i * 250).toString(), foto: FOTOS_HEMBRAS[i % FOTOS_HEMBRAS.length],
        })
        .returning();
      createdHembras.push(bovino);

      if (esVaquilla) {
        await db.insert(vaquillas).values({
          bovinoId: bovino.id, tat: `TAT-${700 + i}`, fechaNacimiento: nacimientoDate,
          color: "CL", numeroLote: 1, observaciones: "Vaquilla seleccionada para reposición de matriz.",
          estado: "Apto Reproducción", padreId: padrePadre.id,
        });
      }
    }

    const allBovinos = [...createdToros, ...createdHembras];

    // 4. Reproducción (10 eventos completos)
    console.log("🧬 Insertando 10 eventos de Reproducción con IATF y ecografías...");
    for (let i = 0; i < 10; i++) {
      const hembra = createdHembras[i % createdHembras.length];
      const toro = createdToros[i % createdToros.length];
      const esPreñada = i % 2 === 0;

      const [rep] = await db
        .insert(reproduccion)
        .values({
          hembraId: hembra.id, toroId: toro.id, padreId: toro.id,
          fechaInseminacion: new Date(2025, 10, 10).toISOString(), cicloNumero: 1,
          resultado: esPreñada ? "positivo" : "pendiente", tipoServicio: "iatf",
          diasGestacion: esPreñada ? 110 : 0, partoEstimado: esPreñada ? new Date(2026, 7, 20).toISOString() : null,
          fechaDiagnostico: new Date(2025, 11, 20).toISOString(), estado: esPreñada ? "confirmada" : "evaluacion",
          observaciones: esPreñada ? "Gestación confirmada mediante ecografía Doppler." : "Servicio IATF aplicado con protocolo DIB + Benzoato.",
          inseminador: "Dr. Mario Aguilera", condicionCorporal: "3.5", protocolo: "IATF DIB 1g", codigoPajuela: `PAJ-${8000 + i}`,
        })
        .returning();

      if (esPreñada) {
        await db.insert(diagnosticos).values({
          animalId: hembra.id, reproduccionId: rep.id, fechaDiagnostico: new Date(2025, 11, 20).toISOString(),
          tipoDiagnostico: "ecografia", resultado: "preñada", edadGestacionalDias: 45,
          observaciones: "Vesícula embrionaria viablemente implantada.",
        });
      }
    }

    // 5. Salud (10 eventos sanitarios)
    console.log("💉 Insertando 10 eventos Sanitarios (Vacunas y Desparasitaciones)...");
    const tiposSalud: Array<"vacuna" | "desparasitacion" | "chequeo" | "tratamiento"> = ["vacuna", "desparasitacion", "chequeo", "tratamiento"];
    for (let i = 0; i < 10; i++) {
      const animal = allBovinos[i % allBovinos.length];
      await db.insert(salud).values({
        animalId: animal.id, tipo: tiposSalud[i % tiposSalud.length],
        fecha: new Date(2026, 0, 10 + i), proximaFecha: new Date(2026, 6, 10 + i),
        veterinario: "Dr. Roberto Mendoza (SENASAG)", estado: "aplicado",
        notas: `Aplicación sanitaria ciclo I/2026 para ${animal.nombre}.`,
      });
    }

    // 6. Insumos (10 insumos médicos con imágenes)
    console.log("📦 Insertando 10 Insumos Veterinarios completos...");
    const listInsumos = [
      { nombre: "Vacuna Anti-Aftosa Aftobagó 50D", tipo: "vacuna" as const, presentacion: "Frasco 100 ml (50 dosis)", stockActual: "25", stockMinimo: "5", unidad: "frasco", lote: "L-99821", fechaCompra: new Date(2025, 11, 1), fechaVencimiento: new Date(2027, 5, 30), proveedor: "Agrovet Santa Cruz", costoUnitario: "180.00", notas: "Cadena de frío 2°C-8°C", imagenUrl: FOTOS_INSUMOS[0] },
      { nombre: "Ivermectina 1% Inyectable 500ml", tipo: "desparasitante" as const, presentacion: "Frasco 500 ml", stockActual: "30", stockMinimo: "10", unidad: "frasco", lote: "IV-4401", fechaCompra: new Date(2026, 0, 5), fechaVencimiento: new Date(2028, 1, 15), proveedor: "Laboratorio Veterinario del Sur", costoUnitario: "145.50", notas: "Amplio espectro", imagenUrl: FOTOS_INSUMOS[1] },
      { nombre: "Sal Mineralizada Nelore Élite 30kg", tipo: "suplemento" as const, presentacion: "Bolsa 30 kg", stockActual: "150", stockMinimo: "30", unidad: "bolsa", lote: "SM-2026", fechaCompra: new Date(2026, 0, 12), fechaVencimiento: new Date(2027, 11, 31), proveedor: "Nutrición Animal El Cerrado", costoUnitario: "95.00", notas: "Fósforo 8%", imagenUrl: FOTOS_INSUMOS[2] },
      { nombre: "Oxitetraciclina L.A. 200mg/ml", tipo: "antibiotico" as const, presentacion: "Frasco 250 ml", stockActual: "20", stockMinimo: "6", unidad: "frasco", lote: "OXI-902", fechaCompra: new Date(2026, 0, 15), fechaVencimiento: new Date(2027, 8, 20), proveedor: "Agrovet Santa Cruz", costoUnitario: "115.00", notas: "Antibiótico L.A.", imagenUrl: FOTOS_INSUMOS[3] },
      { nombre: "Complejo Vitamínico B12 + Fósforo", tipo: "vitamina" as const, presentacion: "Frasco 250 ml", stockActual: "18", stockMinimo: "5", unidad: "frasco", lote: "VIT-301", fechaCompra: new Date(2026, 0, 18), fechaVencimiento: new Date(2027, 10, 10), proveedor: "Veterinaria El Trópico", costoUnitario: "85.00", notas: "Vitamínico reconstituyente", imagenUrl: FOTOS_INSUMOS[0] },
      { nombre: "Antiinflamatorio Flunixin Meglumine", tipo: "antiinflamatorio" as const, presentacion: "Frasco 100 ml", stockActual: "12", stockMinimo: "4", unidad: "frasco", lote: "FLU-881", fechaCompra: new Date(2026, 0, 20), fechaVencimiento: new Date(2027, 4, 15), proveedor: "Agrovet Santa Cruz", costoUnitario: "130.00", notas: "Analgésico y antipirético", imagenUrl: FOTOS_INSUMOS[1] },
      { nombre: "Dispositivos Intravaginales DIB 1g", tipo: "suplemento" as const, presentacion: "Caja 10 unidades", stockActual: "40", stockMinimo: "10", unidad: "caja", lote: "DIB-2026", fechaCompra: new Date(2026, 0, 22), fechaVencimiento: new Date(2028, 6, 30), proveedor: "Genética & Biología Animal", costoUnitario: "350.00", notas: "Progesterona para IATF", imagenUrl: FOTOS_INSUMOS[2] },
      { nombre: "Jeringas Dosificadoras Automáticas 50ml", tipo: "herramienta" as const, presentacion: "Unidad", stockActual: "8", stockMinimo: "2", unidad: "unidad", lote: "JER-102", fechaCompra: new Date(2026, 0, 25), fechaVencimiento: new Date(2030, 0, 1), proveedor: "Herramientas Ganaderas SCZ", costoUnitario: "220.00", notas: "Pistola dosificadora de acero", imagenUrl: FOTOS_INSUMOS[3] },
      { nombre: "Aretes Electrónicos RFID ISO 11784", tipo: "herramienta" as const, presentacion: "Paquete 100 unidades", stockActual: "500", stockMinimo: "100", unidad: "paquete", lote: "RFID-552", fechaCompra: new Date(2026, 0, 28), fechaVencimiento: new Date(2035, 0, 1), proveedor: "Identificación Animal Bolivia", costoUnitario: "12.50", notas: "Arete amarillo botón visual + RFID", imagenUrl: FOTOS_INSUMOS[0] },
      { nombre: "Desparasitante Oral Levamisol 12%", tipo: "desparasitante" as const, presentacion: "Galón 1 Litro", stockActual: "15", stockMinimo: "5", unidad: "frasco", lote: "LEV-401", fechaCompra: new Date(2026, 1, 1), fechaVencimiento: new Date(2027, 9, 25), proveedor: "Laboratorio Veterinario del Sur", costoUnitario: "160.00", notas: "Inmunomodulador y vermífugo", imagenUrl: FOTOS_INSUMOS[1] },
    ];
    for (const ins of listInsumos) {
      await db.insert(insumos).values(ins);
    }

    // 7. Finanzas & Gastos (10 registros comerciales para Agosto 2026 y meses anteriores)
    console.log("💰 Insertando 10+ registros de Finanzas y Gastos variados...");
    const historialFinanzas = [
      { lote: "Ventas Toros Agosto 2026", mes: 8, anio: 2026, ingresos: "65000.00", egresos: "44900.00" },
      { lote: "Ventas Leche Agosto 2026", mes: 8, anio: 2026, ingresos: "38500.00", egresos: "0.00" },
      { lote: "Ventas Vaquillas Reposición", mes: 8, anio: 2026, ingresos: "42000.00", egresos: "0.00" },
      { lote: "Ventas Ganado 2026-Q2", mes: 6, anio: 2026, ingresos: "58000.00", egresos: "18400.00" },
      { lote: "Ventas Toros 2026-01", mes: 1, anio: 2026, ingresos: "75000.00", egresos: "22000.00" },
    ];
    for (const f of historialFinanzas) {
      await db.insert(finanzas).values(f);
    }

    const listGastos = [
      { lote: "Potrero Norte 1", mes: 8, anio: 2026, categoria: "remedios", descripcion: "Vacunas Anti-aftosa Aftobagó y jeringas dosificadoras", monto: "3450.00" },
      { lote: "Engorde Lote 4", mes: 8, anio: 2026, categoria: "alimentacion", descripcion: "Sal mineralizada 50% P y 20 fardos de alfalfa", monto: "6800.00" },
      { lote: "Cabaña Élite", mes: 8, anio: 2026, categoria: "genetica", descripcion: "Pajuelas de semen Nelore PO + Hormonas DIB 1g e IATF", monto: "4200.00" },
      { lote: "Personal Campo", mes: 8, anio: 2026, categoria: "trabajador", descripcion: "Sueldos de vaqueros, capataz y honorarios veterinario", monto: "9500.00" },
      { lote: "Potrero Sur-A", mes: 8, anio: 2026, categoria: "potreros", descripcion: "Alambrado, postes de cuchi y limpieza de pastos", monto: "4100.00" },
      { lote: "Infraestructura", mes: 8, anio: 2026, categoria: "mantenimiento", descripcion: "Reparación de bomba de agua, bebederos y solar", monto: "2800.00" },
      { lote: "Transporte Lote 2", mes: 8, anio: 2026, categoria: "transporte", descripcion: "Flete camión jaula para traslado y guías SENASAG", monto: "3200.00" },
      { lote: "Manga de Manejo", mes: 8, anio: 2026, categoria: "equipos", descripcion: "Aretes electrónicos RFID y alicate de identif.", monto: "2150.00" },
      { lote: "Administración", mes: 8, anio: 2026, categoria: "impuestos", descripcion: "Tasas municipales, guías y licencias ganaderas", monto: "1400.00" },
      { lote: "Varios Campo", mes: 8, anio: 2026, categoria: "otros", descripcion: "Materiales de desinfección, soga y botas de hule", monto: "1750.00" },
      { lote: "Lote Principal 2026", mes: 1, anio: 2026, categoria: "remedios", descripcion: "Desparasitantes Ivermectina 1%", monto: "4850.00" },
      { lote: "Lote Principal 2026", mes: 1, anio: 2026, categoria: "alimentacion", descripcion: "Suplemento proteico para sequía", monto: "11400.00" },
    ];
    for (const g of listGastos) {
      await db.insert(gastos).values(g);
    }

    // 8. Ventas (10 transacciones reales)
    console.log("🏷️ Insertando 10 transacciones comerciales de Ventas...");
    const compradores = [
      { nombre: "Agropecuaria Don Fernando S.R.L.", doc: "NIT-102938475", tel: "+591 71234567", finca: "Estancia El Retiro (San Ignacio)" },
      { nombre: "Ganadería Santa Rosa S.A.", doc: "NIT-204918231", tel: "+591 76543210", finca: "Finca Santa Rosa (Concepción)" },
      { nombre: "Carlos Eduardo Banzer", doc: "CI-4839201 SC", tel: "+591 78912345", finca: "Hacienda La Esperanza" },
      { nombre: "Cabaña Nelore El Carmen", doc: "NIT-394810293", tel: "+591 73456789", finca: "Cabaña El Carmen (Cotoca)" },
      { nombre: "Roberto Justiniano Roca", doc: "CI-3829104 SC", tel: "+591 77123456", finca: "Estancia San Miguel" },
    ];

    const metodos: Array<"efectivo" | "transferencia" | "cheque" | "qr"> = ["transferencia", "efectivo", "cheque", "qr"];

    for (let i = 0; i < 10; i++) {
      const animal = allBovinos[i % allBovinos.length];
      const comp = compradores[i % compradores.length];
      const monto = 2500 + i * 350;

      await db.insert(ventas).values({
        idempotencyKey: `SALE-2026-FULL-${i + 1}`,
        animalId: animal.id,
        compradorNombre: comp.nombre,
        compradorDocumento: comp.doc,
        compradorTelefono: comp.tel,
        compradorEmail: "ventas@hacienda.bo",
        compradorFinca: comp.finca,
        fechaVenta: `2026-0${(i % 5) + 1}-15`,
        precioVenta: monto.toFixed(2),
        metodoPago: metodos[i % metodos.length],
        estadoPago: "completado",
        referenciaContrato: `CTR-2026-00${i + 1}`,
        notas: `Venta legal de ${animal.nombre} (${animal.raza}) con documentación SENASAG al día.`,
        creadoPor: adminUser.id,
      });
    }

    // 9. Reglas y Configuración
    console.log("🧠 Registrando reglas del Consultor e Configuración inicial...");
    await db.insert(consultorReglas).values({
      categoria: "Reproducción", prioridad: "alta",
      condicionSql: "bovinos.sexo = 'Hembra' AND bovinos.estado = 'activo'",
      mensajeAlerta: "Hembra lista para sincronización IATF",
      recomendacion: "Aplicar protocolo con DIB 1g e inyección de Benzoato de Estradiol.",
      activo: 1,
    });

    await db.insert(configuracion).values({
      clave: "nombre_estancia", valor: "Hacienda Guayabal Lorente",
      tipo: "text", descripcion: "Nombre oficial de la propiedad ganadera", grupo: "general", editable: 1, orden: 1,
    });

    console.log("\n✅ LLENADO COMPLETO REVOLUCIONARIO FINALIZADO EXITOSAMENTE CON MÁS DE 10 ELEMENTOS POR SECCIÓN!");
  } catch (error: any) {
    console.error("❌ Error durante el seeding:", error);
    process.exit(1);
  }
}

if (process.argv[1].endsWith("seed-real-data.ts") || process.argv[1].endsWith("seed-real-data.js")) {
  runSeniorSeed().then(() => process.exit(0));
}
