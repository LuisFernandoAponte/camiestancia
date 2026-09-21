import { Hono } from "hono";
import { getCurrentUser } from "@/lib/jwt.js";
import { AppError } from "@/lib/errors.js";
import { createBovinoSchema, updateBovinoSchema, paginationSchema, bulkUpdateSchema } from "./validations.js";
import {
  listBovinos,
  searchBovinos,
  getBovinoById,
  getGenealogiaCompleta,
  createBovino,
  updateBovino,
  bulkUpdateBovinos,
  deleteBovino,
} from "./controller.js";

export const bovinosRoutes = new Hono();

bovinosRoutes.get("/", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);

  const pagination = paginationSchema.parse(c.req.query());
  const estado = c.req.query("estado");
  const potrero = c.req.query("potrero");
  const q = c.req.query("q");
  const sexo = c.req.query("sexo");
  const raza = c.req.query("raza");
  const pesoMin = c.req.query("pesoMin") ? parseFloat(c.req.query("pesoMin")!) : undefined;
  const pesoMax = c.req.query("pesoMax") ? parseFloat(c.req.query("pesoMax")!) : undefined;

  const result = await listBovinos(pagination, { estado, potrero, q, sexo, raza, pesoMin, pesoMax });
  return c.json(result);
});

bovinosRoutes.get("/search", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);

  const q = c.req.query("q");
  if (!q) {
    throw new AppError("Parámetro q requerido", "MISSING_PARAM", 400);
  }

  const result = await searchBovinos(q);
  return c.json(result);
});

bovinosRoutes.get("/:id/genealogia", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);

  const id = c.req.param("id");
  const result = await getGenealogiaCompleta(id);
  return c.json(result);
});

bovinosRoutes.get("/:id", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);

  const id = c.req.param("id");
  const result = await getBovinoById(id);
  return c.json(result);
});

bovinosRoutes.post("/", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);

  if (!["admin", "gestor"].includes(user.rol)) {
    throw new AppError("Permiso denegado", "FORBIDDEN", 403);
  }

  const body = await c.req.json();
  const data = createBovinoSchema.parse(body);
  const result = await createBovino(data, user);
  return c.json(result, 201);
});

bovinosRoutes.post("/bulk", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);

  if (!["admin", "gestor"].includes(user.rol)) {
    throw new AppError("Permiso denegado", "FORBIDDEN", 403);
  }

  const body = await c.req.json();
  const { ids, data } = bulkUpdateSchema.parse(body);
  const result = await bulkUpdateBovinos(ids, data, user);
  return c.json(result);
});

bovinosRoutes.put("/:id", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);

  if (!["admin", "gestor"].includes(user.rol)) {
    throw new AppError("Permiso denegado", "FORBIDDEN", 403);
  }

  const id = c.req.param("id");
  const body = await c.req.json();
  const data = updateBovinoSchema.parse(body);
  const result = await updateBovino(id, data, user);
  return c.json(result);
});

bovinosRoutes.delete("/:id", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);

  if (user.rol !== "admin") {
    throw new AppError("Solo administradores pueden eliminar bovinos", "FORBIDDEN", 403);
  }

  const id = c.req.param("id");
  const result = await deleteBovino(id, user);
  return c.json(result);
});

export default bovinosRoutes;
