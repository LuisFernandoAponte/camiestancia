import { Hono } from "hono";
import { getCurrentUser } from "@/lib/jwt.js";
import { AppError } from "@/lib/errors.js";
import { createVentaSchema } from "./validations.js";
import { createVenta, listVentas, getVentaById } from "./controller.js";
import logger from "@/utils/logger.js";

export const ventasRoutes = new Hono();

ventasRoutes.post("/", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);

  if (!["admin", "gestor"].includes(user.rol)) {
    throw new AppError("Permiso denegado", "FORBIDDEN", 403);
  }

  const body = await c.req.json();
  const data = createVentaSchema.parse(body);

  const result = await createVenta(data);

  if (!result.success) {
    logger.info({ idempotencyKey: data.idempotencyKey, usuarioId: user.id }, "Intento de venta duplicada");
    return c.json(result, 200);
  }

  logger.info({ usuarioId: user.id, ventaId: result.data.id }, "Venta registrada exitosamente");
  return c.json(result, 201);
});

ventasRoutes.get("/", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);

  if (!["admin", "gestor"].includes(user.rol)) {
    throw new AppError("Permiso denegado", "FORBIDDEN", 403);
  }

  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "20");

  const result = await listVentas({ page, limit });
  return c.json(result);
});

ventasRoutes.get("/:id", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);

  const id = c.req.param("id");
  const result = await getVentaById(id);
  return c.json(result);
});

export default ventasRoutes;
