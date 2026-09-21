import {
  findAll,
  findById,
  findByAnimalId,
  animalExists,
  create,
  update,
  remove,
  getDashboardKpis,
} from "./repository.js";
import { SaludCreateSchema, SaludUpdateSchema, type SaludCreate, type SaludUpdate } from "./validations.js";
import { AppError } from "@/lib/errors.js";
import logger from "@/utils/logger.js";

export async function list(params: { estado?: string; animal_id?: string; tipo?: string }, pagination: { page: number; limit: number }) {
  const { data, total } = await findAll(params, pagination);
  const totalPages = Math.ceil(total / pagination.limit);

  logger.info(`Eventos salud listados: ${data.length}/${total}`);

  return {
    data,
    meta: {
      total,
      page: pagination.page,
      limit: pagination.limit,
      pages: totalPages,
    },
  };
}

export async function getById(id: string) {
  const event = await findById(id);
  if (!event) throw new AppError("Evento no encontrado", "NOT_FOUND", 404);
  return event;
}

export async function getByAnimalId(animalId: string) {
  return findByAnimalId(animalId);
}

export async function createEvent(createData: SaludCreate) {
  const parsed = SaludCreateSchema.parse(createData);

  const exists = await animalExists(parsed.animal_id);
  if (!exists) throw new AppError("Animal no encontrado", "NOT_FOUND", 404);

  const newEvent = await create(parsed);
  logger.info(`Evento de salud creado para animal ${parsed.animal_id}`);
  return newEvent;
}

export async function updateEvent(id: string, updateData: SaludUpdate) {
  const parsed = SaludUpdateSchema.parse(updateData);

  const existing = await findById(id);
  if (!existing) throw new AppError("Evento no encontrado", "NOT_FOUND", 404);

  if (Object.keys(parsed).length === 0) {
    throw new AppError("No hay campos para actualizar", "VALIDATION_ERROR", 400);
  }

  const updated = await update(id, parsed);
  if (!updated) throw new AppError("Error actualizando evento", "UPDATE_ERROR", 500);

  logger.info(`Evento de salud actualizado: ${id}`);
  return updated;
}

export async function deleteEvent(id: string) {
  const existing = await findById(id);
  if (!existing) throw new AppError("Evento no encontrado", "NOT_FOUND", 404);

  const deleted = await remove(id);
  if (!deleted) throw new AppError("Error eliminando evento", "DELETE_ERROR", 500);

  logger.info(`Evento de salud eliminado: ${id}`);
}

export async function dashboard() {
  return getDashboardKpis();
}
