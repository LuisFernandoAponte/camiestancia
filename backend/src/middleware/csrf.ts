import { createMiddleware } from "hono/factory";
import { getCookie, setCookie } from "hono/cookie";
import crypto from "crypto";
import type { Context } from "hono";
import { CSRF_COOKIE, csrfCookieOptions } from "@/lib/cookies.js";

export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function setCsrfCookie(c: Context) {
  const token = generateCsrfToken();
  setCookie(c, CSRF_COOKIE, token, csrfCookieOptions);
  return token;
}

export const csrfMiddleware = createMiddleware(async (c, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(c.req.method)) {
    await next();
    return;
  }

  if (c.req.path === "/api/auth/login") {
    await next();
    return;
  }

  // En entorno de desarrollo local, omitir bloqueo de CSRF si ya está autenticado por JWT
  if (process.env.NODE_ENV !== "production") {
    await next();
    return;
  }

  const cookieToken = getCookie(c, CSRF_COOKIE);
  const headerToken = c.req.header("X-CSRF-Token");

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return c.json(
      {
        success: false,
        error: {
          message: "CSRF token inválido",
          code: "CSRF_INVALID",
        },
      },
      403,
    );
  }

  await next();
});

