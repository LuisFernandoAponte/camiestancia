import db from "@/db/index.js";
import { ventas, finanzas } from "@/db/schema.js";
import { eq, and, sql } from "drizzle-orm";
import { AppError } from "@/lib/errors.js";
import type { CreateVentaInput } from "./validations.js";
import logger from "@/utils/logger.js";

// ... existing imports ...

export async function createVenta(input: CreateVentaInput) {
  const { idempotencyKey, animalId, compradorNombre, precioVenta, metodoPago, ...rest } = input;

  const insertData = {
    idempotencyKey,
    animalId,
    compradorNombre,
    precioVenta: precioVenta.toString(),
    metodoPago: metodoPago as any,
    compradorDocumento: rest.compradorDocumento || null,
    compradorTelefono: rest.compradorTelefono || null,
    compradorEmail: rest.compradorEmail || null,
    compradorFinca: rest.compradorFinca || null,
    referenciaContrato: rest.referenciaContrato || null,
    notas: rest.notas || null,
    creadoPor: rest.creadoPor || null,
    fechaVenta: (input as any).fechaVenta || new Date().toISOString().split("T")[0],
    estadoPago: "pendiente",
  };

  const [result] = await db
    .insert(ventas)
    .values(insertData)
    .onConflictDoNothing()
    .returning({ id: ventas.id, animalId: ventas.animalId, createdAt: ventas.createdAt });

  if (!result) {
    logger.warn({ idempotencyKey }, `Venta duplicada (idempotency): ${idempotencyKey}`);
    return {
      success: false as const,
      error: {
        message: "Venta ya registrada",
        code: "DUPLICATE_VENTA",
      },
    };
  }

  // Auto-registrar ingreso en finanzas
  try {
    const ahora = new Date();
    const mes = ahora.getMonth() + 1;
    const anio = ahora.getFullYear();
    const loteVentas = "Ventas de animales";

    const [existing] = await db
      .select()
      .from(finanzas)
      .where(
        and(
          eq(finanzas.lote, loteVentas),
          eq(finanzas.mes, mes),
          eq(finanzas.anio, anio),
        ),
      );

    if (existing) {
      const nuevoIngreso = parseFloat(String(existing.ingresos)) + precioVenta;
      await db
        .update(finanzas)
        .set({ ingresos: nuevoIngreso.toString() })
        .where(eq(finanzas.id, existing.id));
    } else {
      await db.insert(finanzas).values({
        lote: loteVentas,
        mes,
        anio,
        ingresos: precioVenta.toString(),
        egresos: "0",
      });
    }
    logger.info(`Ingreso registrado en finanzas: ${loteVentas} +$${precioVenta} (${mes}/${anio})`);
  } catch (e) {
    // No bloquear la venta si falla el registro en finanzas
    logger.error("Error registrando ingreso en finanzas:", e);
  }

  logger.info(
    { idempotencyKey, ventaId: result.id, animalId: result.animalId },
    `Venta creada: ${result.id}`,
  );

  return {
    success: true as const,
    data: {
      id: result.id,
      animalId: result.animalId,
      createdAt: result.createdAt,
    },
  };
}

export async function listVentas(pagination: { page: number; limit: number }) {
  const { page, limit } = pagination;
  const offset = (page - 1) * limit;

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)` })
    .from(ventas);

  const data = await db
    .select()
    .from(ventas)
    .limit(limit)
    .offset(offset)
    .orderBy(sql`${ventas.createdAt} DESC`);

  const totalPages = Math.ceil(Number(total) / limit);

  logger.info(`Ventas listadas: ${data.length}/${total}`);

  return {
    success: true as const,
    data: data.map((v) => ({
      ...v,
      precioVenta: parseFloat(v.precioVenta.toString()),
    })),
    meta: { page, limit, total: Number(total), pages: totalPages },
  };
}

export async function getVentaById(id: string) {
  const [venta] = await db.select().from(ventas).where(eq(ventas.id, id));

  if (!venta) {
    throw new AppError("Venta no encontrada", "VENTA_NOT_FOUND", 404);
  }

  logger.info(`Venta consultada: ${id}`);

  return {
    success: true as const,
    data: {
      ...venta,
      precioVenta: parseFloat(venta.precioVenta.toString()),
    },
  };
}
