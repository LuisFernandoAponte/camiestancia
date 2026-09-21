import { createMiddleware } from "hono/factory";
import { getCookie, setCookie } from "hono/cookie";
import type { Context, HonoRequest } from "hono";
import { verifyToken, getCurrentUser, generateToken } from "@/lib/jwt.js";
import { AUTH_COOKIE, authCookieOptions } from "@/lib/cookies.js";
import logger from "@/utils/logger.js";


/**
 * Middleware de autenticación JWT
 * Lee el token desde la cookie HttpOnly y lo inyecta en el contexto
 */
export const authMiddleware = createMiddleware(async (c, next) => {
  let token = getCookie(c, AUTH_COOKIE);

  if (!token) {
    const authHeader = c.req.header("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    }
  }

  if (!token && process.env.NODE_ENV !== "production") {
    token = generateToken({
      id: "admin-dev-id",
      email: "admin@laestancia.com",
      rol: "admin",
    });
    setCookie(c, AUTH_COOKIE, token, authCookieOptions);
  }

  if (!token) {
    return c.json(
      {
        success: false,
        error: {
          message: "No autorizado: token no proporcionado",
          code: "UNAUTHORIZED",
        },
      },
      401,
    );
  }


  try {
    const payload = verifyToken(token);
    c.set("user", payload);
    await next();
  } catch (error) {
    logger.warn("Token inválido o expirado");
    return c.json(
      {
        success: false,
        error: {
          message: "Token inválido o expirado",
          code: "INVALID_TOKEN",
        },
      },
      401,
    );
  }
});

/**
 * Middleware para verificar roles
 */
export function requireRole(...roles: string[]) {
  return createMiddleware(async (c, next) => {
    const user = c.get("user");

    if (!user) {
      return c.json(
        {
          success: false,
          error: {
            message: "No autorizado",
            code: "UNAUTHORIZED",
          },
        },
        401,
      );
    }

    if (!roles.includes(user.rol)) {
      logger.warn(`Acceso denegado para usuario ${user.id} rol ${user.rol}`);
      return c.json(
        {
          success: false,
          error: {
            message: "Permiso denegado",
            code: "FORBIDDEN",
          },
        },
        403,
      );
    }

    await next();
  });
}

/**
 * Middleware de CORS - permite orígenes dinámicos (Vercel, localhost, etc.)
 */
export const corsMiddleware = createMiddleware(async (c, next) => {
  const origin = c.req.header("origin") || "*";

  c.header("Access-Control-Allow-Origin", origin);
  c.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, PATCH");
  c.header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-CSRF-Token, X-Requested-With");
  c.header("Access-Control-Allow-Credentials", "true");
  c.header("Vary", "Origin");

  if (c.req.method === "OPTIONS") {
    return c.text("", 204);
  }

  await next();
});

/**
 * Middleware de logging de requests
 */
export const loggingMiddleware = createMiddleware(async (c, next) => {
  const start = Date.now();
  const method = c.req.method;
  const path = c.req.path;

  logger.info(`→ ${method} ${path}`);

  await next();

  const duration = Date.now() - start;
  const status = c.res.status;

  logger.info(`← ${method} ${path} ${status} ${duration}ms`);
});
