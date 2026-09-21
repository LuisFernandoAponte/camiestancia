import type { Context } from "hono";
import { getCurrentUser } from "@/lib/jwt.js";
import { AppError } from "@/lib/errors.js";
import * as service from "./service.js";
import { PaginationSchema } from "./validations.js";

export async function list(c: Context) {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);

  const { page, limit } = PaginationSchema.parse(c.req.query());
  const estado = c.req.query("estado");
  const animal_id = c.req.query("animal_id");
  const tipo = c.req.query("tipo");

  const result = await service.list({ estado, animal_id, tipo }, { page, limit });

  return c.json({ success: true, ...result });
}

export async function getById(c: Context) {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);

  const id = c.req.param("id");
  if (!id) throw new AppError("ID requerido", "VALIDATION_ERROR", 400);
  const data = await service.getById(id);

  return c.json({ success: true, data });
}

export async function history(c: Context) {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);

  const animal_id = c.req.param("animal_id");
  if (!animal_id) throw new AppError("ID de animal requerido", "VALIDATION_ERROR", 400);
  const data = await service.getByAnimalId(animal_id);

  return c.json({ success: true, data });
}

export async function create(c: Context) {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);

  if (!["admin", "gestor", "veterinario"].includes(user.rol)) {
    throw new AppError("Permiso denegado", "FORBIDDEN", 403);
  }

  const body = await c.req.json();
  const data = await service.createEvent(body);

  return c.json({ success: true, data, message: "Evento creado exitosamente" }, 201);
}

export async function update(c: Context) {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);

  if (!["admin", "gestor", "veterinario"].includes(user.rol)) {
    throw new AppError("Permiso denegado", "FORBIDDEN", 403);
  }

  const id = c.req.param("id");
  if (!id) throw new AppError("ID requerido", "VALIDATION_ERROR", 400);
  const body = await c.req.json();
  const data = await service.updateEvent(id, body);

  return c.json({ success: true, data, message: "Evento actualizado exitosamente" });
}

export async function remove(c: Context) {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);

  if (user.rol !== "admin") {
    throw new AppError("Solo admin puede eliminar", "FORBIDDEN", 403);
  }

  const id = c.req.param("id");
  if (!id) throw new AppError("ID requerido", "VALIDATION_ERROR", 400);
  await service.deleteEvent(id);

  return c.json({ success: true, message: "Evento eliminado exitosamente" });
}

export async function dashboardKpis(c: Context) {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);

  const data = await service.dashboard();
  return c.json({ success: true, data });
}
