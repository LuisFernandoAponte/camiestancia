import { Hono } from "hono";
import { serve } from "@hono/node-server";
import logger from "@/utils/logger.js";
import { authMiddleware, corsMiddleware, loggingMiddleware, requireRole } from "@/middleware/index.js";
import { csrfMiddleware, setCsrfCookie } from "@/middleware/csrf.js";
import { securityHeaders, bodyLimit } from "@/middleware/security.js";
import { errorHandler } from "@/lib/errors.js";
import { authPublicRoutes, authProtectedRoutes } from "@/modules/auth/routes.js";
import bovinosRoutes from "@/modules/bovinos/routes.js";
import saludRoutes from "@/modules/salud/routes.js";
import reproduccionRoutes from "@/modules/reproduccion/routes.js";
import finanzasRoutes from "@/modules/finanzas/routes.js";
import dashboardRoutes from "@/modules/dashboard/routes.js";
import gastosRoutes from "@/modules/gastos/routes.js";
import ventasRoutes from "@/modules/ventas/routes.js";
import consultorRoutes from "@/modules/consultor/routes.js";
import whatsappRoutes from "@/modules/whatsapp/routes.js";
import insumosRoutes from "@/modules/insumos/routes.js";
import configuracionRoutes from "@/modules/configuracion/routes.js";
import catalogoRoutes from "@/modules/catalogo/routes.js";
import iatfRoutes from "@/modules/iatf/routes.js";
import torosRoutes from "@/modules/toros/routes.js";
import genealogiaRoutes from "@/modules/genealogia/routes.js";
import vaquillasRoutes from "@/modules/vaquillas/routes.js";
import diagnosticosRoutes from "@/modules/diagnosticos/routes.js";
import uploadRoutes from "@/modules/upload/routes.js";
import { swaggerDefinition } from "@/lib/swagger.js";


const app = new Hono();

// ============================================================================
// MIDDLEWARE GLOBAL (se ejecuta en TODAS las rutas)
// ============================================================================

app.use(corsMiddleware);
app.use(securityHeaders);
app.use(bodyLimit);
app.use(loggingMiddleware);

// ============================================================================
// RUTAS PÚBLICAS (sin autenticación)
// ============================================================================

/**
 * Health Check
 */
app.get("/health", (c) =>
  c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  }),
);

/**
 * Swagger/OpenAPI Docs
 */
app.get("/api/docs", (c) =>
  c.json(swaggerDefinition),
);

/**
 * Login (público, con rate limiting)
 */
app.route("/api/auth", authPublicRoutes);

/**
 * Configuración pública (sin autenticación)
 */
app.get("/api/configuracion/public", async (c) => {
  const { pool } = await import("@/db/index.js");
  try {
    const r = await pool.query("SELECT clave, valor FROM configuracion");
    const map: Record<string, string> = {};
    for (const row of r.rows) map[row.clave] = row.valor;
    return c.json({ success: true, data: map });
  } catch {
    return c.json({ success: true, data: { farm_name: "La Estancia" } });
  }
});

/**
 * Catálogo público (sin autenticación)
 */
app.route("/api/catalogo", catalogoRoutes);

/**
 * Endpoint para obtener el token CSRF (público)
 */
app.get("/api/auth/csrf", (c) => {
  setCsrfCookie(c);
  return c.json({ success: true });
});

// ============================================================================
// RUTAS PROTEGIDAS
// ============================================================================

// Middleware de autenticación para rutas protegidas
app.use("/api/*", authMiddleware);

// Middleware CSRF para rutas protegidas (después de auth)
app.use("/api/bovinos", csrfMiddleware);
app.use("/api/auth", csrfMiddleware);
app.use("/api/salud", csrfMiddleware);
app.use("/api/reproduccion", csrfMiddleware);
app.use("/api/finanzas", csrfMiddleware);
app.use("/api/gastos", csrfMiddleware);
app.use("/api/ventas", csrfMiddleware);
app.use("/api/consultor", csrfMiddleware);
app.use("/api/whatsapp", csrfMiddleware);
app.use("/api/insumos", csrfMiddleware);
app.use("/api/configuracion", csrfMiddleware);
app.use("/api/iatf", csrfMiddleware);
app.use("/api/toros", csrfMiddleware);
app.use("/api/genealogia", csrfMiddleware);
app.use("/api/vaquillas", csrfMiddleware);
app.use("/api/diagnosticos", csrfMiddleware);

// Rutas de módulos
app.route("/api/auth", authProtectedRoutes);
app.route("/api/bovinos", bovinosRoutes);
app.route("/api/salud", saludRoutes);
app.route("/api/reproduccion", reproduccionRoutes);
app.route("/api/finanzas", finanzasRoutes);
app.route("/api/gastos", gastosRoutes);
app.route("/api/ventas", ventasRoutes);
app.route("/api/dashboard", dashboardRoutes);
app.route("/api/consultor", consultorRoutes);
app.route("/api/whatsapp", whatsappRoutes);
app.route("/api/insumos", insumosRoutes);
app.route("/api/configuracion", configuracionRoutes);
app.route("/api/iatf", iatfRoutes);
app.route("/api/toros", torosRoutes);
app.route("/api/genealogia", genealogiaRoutes);
app.route("/api/vaquillas", vaquillasRoutes);
app.route("/api/diagnosticos", diagnosticosRoutes);
app.route("/api/upload", uploadRoutes);


// ============================================================================
// MANEJO DE ERRORES
// ============================================================================

app.onError((error, c) => {
  return errorHandler(error, c);
});

// ============================================================================
// 404
// ============================================================================

app.notFound((c) =>
  c.json(
    {
      success: false,
      error: {
        message: "Endpoint no encontrado",
        code: "NOT_FOUND",
      },
    },
    404,
  ),
);

// ============================================================================
// STARTUP
// ============================================================================

const port = parseInt(process.env.PORT || "3000", 10);

serve(
  { fetch: app.fetch, port, hostname: "0.0.0.0" },
  (info) => {
    logger.info(`[INICIO] Backend La Estancia corriendo en puerto ${info.port}`);
    logger.info(`[DOCS]  Swagger: http://0.0.0.0:${info.port}/api/docs`);
    logger.info(`[JWT]   ${process.env.JWT_SECRET ? "OK - Configurado" : "ERROR - NO CONFIGURADO"}`);
    logger.info(`[DB]    ${process.env.DATABASE_URL ? "OK - Base de datos conectada" : "ERROR - NO CONFIGURADA"}`);
  },
);

