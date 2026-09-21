import { Hono } from "hono";
import { listCatalogo } from "./controller.js";

export const catalogoRoutes = new Hono();

catalogoRoutes.get("/", async (c) => {
  const q = c.req.query("q");
  const raza = c.req.query("raza");
  const result = await listCatalogo({ q, raza });
  return c.json(result);
});

export default catalogoRoutes;
