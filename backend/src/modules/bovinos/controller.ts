import db from "@/db/index.js";
import { bovinos, salud, reproduccion } from "@/db/schema.js";
import { eq, ilike, or, and, count, gte, lte, inArray, desc } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { AppError } from "@/lib/errors.js";
import type { CreateBovinoInput, UpdateBovinoInput, PaginationInput } from "./validations.js";
import type { JWTPayload } from "@/lib/jwt.js";
import logger from "@/utils/logger.js";

const madreBovino = alias(bovinos, "madre_bovino");
const padreBovino = alias(bovinos, "padre_bovino");

function mapBovinoForResponse(item: any) {
  const bovino = item?.bovino ? item.bovino : item;
  const fotoVal = bovino.foto || bovino.fotoUrl || null;
  return {
    ...bovino,
    foto: fotoVal,
    fotoUrl: fotoVal,
    pesoInicial: parseFloat(bovino.pesoInicial || "0"),
    pesoActual: parseFloat(bovino.pesoActual || "0"),
    precio: bovino.precio ? parseFloat(bovino.precio.toString()) : null,
    madreNombre: item?.madreNombre ?? null,
    madreChip: item?.madreChip ?? null,
    padreNombre: item?.padreNombre ?? null,
    padreChip: item?.padreChip ?? null,
  };
}

export async function listBovinos(
  pagination: PaginationInput,
  filters: { estado?: string; potrero?: string; q?: string; sexo?: string; raza?: string; pesoMin?: number; pesoMax?: number },
) {
  const { page, limit } = pagination;
  const { estado, potrero, q, sexo, raza, pesoMin, pesoMax } = filters;
  const offset = (page - 1) * limit;

  const conditions: any[] = [];
  if (estado) conditions.push(eq(bovinos.estado, estado as any));
  if (potrero) conditions.push(eq(bovinos.potrero, potrero));
  if (sexo) conditions.push(eq(bovinos.sexo, sexo));
  if (raza) conditions.push(eq(bovinos.raza, raza));
  if (pesoMin) conditions.push(gte(bovinos.pesoActual, pesoMin.toString()));
  if (pesoMax) conditions.push(lte(bovinos.pesoActual, pesoMax.toString()));

  if (q) {
    const searchPattern = `%${q}%`;
    conditions.push(
      or(
        ilike(bovinos.chip, searchPattern),
        ilike(bovinos.nombre, searchPattern),
        ilike(bovinos.raza, searchPattern),
      ) as ReturnType<typeof eq>,
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [{ total }] = await db
    .select({ total: count() })
    .from(bovinos)
    .where(where);

  const data = await db
    .select({
      bovino: bovinos,
      madreNombre: madreBovino.nombre,
      madreChip: madreBovino.chip,
      padreNombre: padreBovino.nombre,
      padreChip: padreBovino.chip,
    })
    .from(bovinos)
    .leftJoin(madreBovino, eq(bovinos.madreId, madreBovino.id))
    .leftJoin(padreBovino, eq(bovinos.padreId, padreBovino.id))
    .where(where)
    .orderBy(desc(bovinos.createdAt))
    .limit(limit)
    .offset(offset);

  const totalPages = Math.ceil(total / limit);

  logger.info(`Bovinos listados: ${data.length}/${total}`);

  return {
    success: true as const,
    data: data.map(mapBovinoForResponse),
    meta: { page, limit, total, pages: totalPages },
  };
}

export async function searchBovinos(q: string) {
  const searchPattern = `%${q}%`;
  const results = await db
    .select()
    .from(bovinos)
    .where(
      or(
        ilike(bovinos.chip, searchPattern),
        ilike(bovinos.nombre, searchPattern),
        ilike(bovinos.raza, searchPattern),
      ),
    )
    .limit(10);

  logger.info(`Búsqueda de bovinos: "${q}" → ${results.length} resultados`);

  return {
    success: true as const,
    data: results.map(mapBovinoForResponse),
  };
}

export async function getBovinoById(id: string) {
  const [bovinoData] = await db
    .select({
      bovino: bovinos,
      madreNombre: madreBovino.nombre,
      madreChip: madreBovino.chip,
      padreNombre: padreBovino.nombre,
      padreChip: padreBovino.chip,
    })
    .from(bovinos)
    .leftJoin(madreBovino, eq(bovinos.madreId, madreBovino.id))
    .leftJoin(padreBovino, eq(bovinos.padreId, padreBovino.id))
    .where(eq(bovinos.id, id));

  if (!bovinoData) {
    throw new AppError("Bovino no encontrado", "BOVINO_NOT_FOUND", 404);
  }

  const bovino = bovinoData.bovino;

  const eventosSalud = await db
    .select()
    .from(salud)
    .where(eq(salud.animalId, id));

  const reproducciones = await db
    .select()
    .from(reproduccion)
    .where(
      or(
        eq(reproduccion.hembraId, id),
        eq(reproduccion.padreId, id),
      ),
    );

  logger.info(`Bovino consultado: ${bovino.chip}`);

  return {
    success: true as const,
    data: {
      ...mapBovinoForResponse(bovinoData),
      salud: eventosSalud,
      reproduccion: reproducciones,
    },
  };
}

export async function getGenealogiaCompleta(id: string) {
  const [bovino] = await db.select().from(bovinos).where(eq(bovinos.id, id));
  if (!bovino) throw new AppError("Bovino no encontrado", "BOVINO_NOT_FOUND", 404);

  const [madre] = bovino.madreId ? await db.select().from(bovinos).where(eq(bovinos.id, bovino.madreId)) : [null];
  const [padre] = bovino.padreId ? await db.select().from(bovinos).where(eq(bovinos.id, bovino.padreId)) : [null];

  const [abueloMaterno] = madre?.padreId ? await db.select().from(bovinos).where(eq(bovinos.id, madre.padreId)) : [null];
  const [abuelaMaterna] = madre?.madreId ? await db.select().from(bovinos).where(eq(bovinos.id, madre.madreId)) : [null];

  const [abueloPaterno] = padre?.padreId ? await db.select().from(bovinos).where(eq(bovinos.id, padre.padreId)) : [null];
  const [abuelaPaterna] = padre?.madreId ? await db.select().from(bovinos).where(eq(bovinos.id, padre.madreId)) : [null];

  const hijos = await db
    .select({
      id: bovinos.id,
      nombre: bovinos.nombre,
      chip: bovinos.chip,
      sexo: bovinos.sexo,
      nacimiento: bovinos.nacimiento,
      estado: bovinos.estado,
      raza: bovinos.raza,
    })
    .from(bovinos)
    .where(or(eq(bovinos.madreId, id), eq(bovinos.padreId, id)))
    .orderBy(desc(bovinos.nacimiento));

  const ancestrosMaternos = [madre?.id, madre?.madreId, madre?.padreId, abueloMaterno?.id, abuelaMaterna?.id].filter(Boolean);
  const ancestrosPaternos = [padre?.id, padre?.madreId, padre?.padreId, abueloPaterno?.id, abuelaPaterna?.id].filter(Boolean);
  const ancestrosComunes = ancestrosMaternos.filter((ancId) => ancestrosPaternos.includes(ancId));
  const consanguinidad = ancestrosComunes.length > 0;

  return {
    success: true as const,
    data: {
      animal: mapBovinoForResponse(bovino),
      madre: madre ? mapBovinoForResponse(madre) : null,
      padre: padre ? mapBovinoForResponse(padre) : null,
      abuelos: {
        materno: {
          padre: abueloMaterno ? mapBovinoForResponse(abueloMaterno) : null,
          madre: abuelaMaterna ? mapBovinoForResponse(abuelaMaterna) : null,
        },
        paterno: {
          padre: abueloPaterno ? mapBovinoForResponse(abueloPaterno) : null,
          madre: abuelaPaterna ? mapBovinoForResponse(abuelaPaterna) : null,
        },
      },
      hijos,
      consanguinidad: {
        detectada: consanguinidad,
        ancestrosComunesCount: ancestrosComunes.length,
      },
    },
  };
}

export async function createBovino(
  input: CreateBovinoInput,
  user: JWTPayload,
) {
  const [existing] = await db
    .select()
    .from(bovinos)
    .where(eq(bovinos.chip, input.chip));

  if (existing) {
    throw new AppError(
      `El chip ${input.chip} ya existe`,
      "CHIP_DUPLICATED",
      409,
    );
  }

  const fotoToSave = input.foto || input.fotoUrl || null;
  const insertPayload = { ...input };
  delete (insertPayload as any).fotoUrl;

  const [newBovino] = await db
    .insert(bovinos)
    .values({
      ...insertPayload,
      foto: fotoToSave,
      nacimiento: new Date(input.nacimiento),
      pesoInicial: input.pesoInicial.toString(),
      pesoActual: input.pesoActual.toString(),
      precio: input.precio?.toString(),
    })
    .returning();

  logger.info({ usuarioId: user.id, accion: "CREAR", bovinoId: newBovino.id }, `Bovino creado: ${newBovino.chip}`);

  return {
    success: true as const,
    data: mapBovinoForResponse(newBovino),
    message: "Bovino creado exitosamente",
  };
}

export async function updateBovino(
  id: string,
  input: UpdateBovinoInput,
  user: JWTPayload,
) {
  const [existing] = await db
    .select()
    .from(bovinos)
    .where(eq(bovinos.id, id));

  if (!existing) {
    throw new AppError("Bovino no encontrado", "BOVINO_NOT_FOUND", 404);
  }

  if (input.chip && input.chip !== existing.chip) {
    const [dupChip] = await db
      .select()
      .from(bovinos)
      .where(eq(bovinos.chip, input.chip));

    if (dupChip) {
      throw new AppError(
        `El chip ${input.chip} ya existe`,
        "CHIP_DUPLICATED",
        409,
      );
    }
  }

  const fotoToSave = input.foto !== undefined ? input.foto : input.fotoUrl;
  const cleanInput = { ...input };
  delete (cleanInput as any).fotoUrl;

  const updateData: Record<string, any> = {
    ...cleanInput,
    updatedAt: new Date(),
  };

  if (fotoToSave !== undefined) {
    updateData.foto = fotoToSave;
  }
  if (input.nacimiento) {
    updateData.nacimiento = new Date(input.nacimiento);
  }
  if (input.pesoInicial !== undefined) {
    updateData.pesoInicial = input.pesoInicial.toString();
  }
  if (input.pesoActual !== undefined) {
    updateData.pesoActual = input.pesoActual.toString();
  }
  if (input.precio !== undefined) {
    updateData.precio = input.precio?.toString();
  }

  const [updated] = await db
    .update(bovinos)
    .set(updateData)
    .where(eq(bovinos.id, id))
    .returning();

  logger.info({ usuarioId: user.id, accion: "ACTUALIZAR", bovinoId: id }, `Bovino actualizado: ${updated.chip}`);

  return {
    success: true as const,
    data: mapBovinoForResponse(updated),
    message: "Bovino actualizado exitosamente",
  };
}

export async function bulkUpdateBovinos(
  ids: string[],
  input: UpdateBovinoInput,
  user: JWTPayload,
) {
  const updateData: Record<string, any> = {
    ...input,
    updatedAt: new Date(),
  };

  if (input.nacimiento) {
    updateData.nacimiento = new Date(input.nacimiento);
  }
  if (input.pesoInicial !== undefined) {
    updateData.pesoInicial = input.pesoInicial.toString();
  }
  if (input.pesoActual !== undefined) {
    updateData.pesoActual = input.pesoActual.toString();
  }
  if (input.precio !== undefined) {
    updateData.precio = input.precio?.toString();
  }

  const updated = await db
    .update(bovinos)
    .set(updateData)
    .where(inArray(bovinos.id, ids))
    .returning();

  logger.info({ usuarioId: user.id, accion: "BULK_UPDATE", ids }, `Bovinos actualizados en lote: ${updated.length}`);

  return {
    success: true as const,
    data: updated.map(mapBovinoForResponse),
    message: `${updated.length} bovinos actualizados exitosamente`,
  };
}

export async function deleteBovino(id: string, user: JWTPayload) {
  if (user.rol !== "admin") {
    throw new AppError("Solo administradores pueden eliminar bovinos", "FORBIDDEN", 403);
  }

  const [existing] = await db
    .select()
    .from(bovinos)
    .where(eq(bovinos.id, id));

  if (!existing) {
    throw new AppError("Bovino no encontrado", "BOVINO_NOT_FOUND", 404);
  }

  const targetEstado = existing.estado === "vendido" ? "fallecido" : "vendido";

  const [updated] = await db
    .update(bovinos)
    .set({
      estado: targetEstado,
      updatedAt: new Date(),
    })
    .where(eq(bovinos.id, id))
    .returning();

  logger.info({ usuarioId: user.id, accion: "ELIMINAR", bovinoId: id }, `Bovino eliminado (soft): ${updated.chip} → ${targetEstado}`);

  return {
    success: true as const,
    data: mapBovinoForResponse(updated),
    message: "Bovino marcado como vendido",
  };
}
