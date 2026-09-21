import { Hono } from "hono";
import * as controller from "./controller.js";

export const saludRoutes = new Hono();

saludRoutes.get("/", controller.list);
saludRoutes.get("/dashboard", controller.dashboardKpis);
saludRoutes.get("/bovino/:animal_id", controller.history);
saludRoutes.get("/:id", controller.getById);
saludRoutes.post("/", controller.create);
saludRoutes.put("/:id", controller.update);
saludRoutes.delete("/:id", controller.remove);

export default saludRoutes;
