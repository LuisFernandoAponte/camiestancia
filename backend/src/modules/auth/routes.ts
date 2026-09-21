import { Hono } from "hono";
import { setCookie, deleteCookie } from "hono/cookie";
import db from "@/db/index.js";
import { usuarios } from "@/db/schema.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { generateToken, getCurrentUser, verifyToken } from "@/lib/jwt.js";
import { authCookieOptions, AUTH_COOKIE, CSRF_COOKIE, csrfCookieOptions } from "@/lib/cookies.js";
import { setCsrfCookie } from "@/middleware/csrf.js";
import { LoginSchema } from "@/lib/schemas.js";
import { AppError } from "@/lib/errors.js";
import logger from "@/utils/logger.js";
import { rateLimit, ipKey } from "@/lib/rate-limiter.js";

// ============================================================================
// Rutas PÚBLICAS de autenticación (login)
// ============================================================================

export const authPublicRoutes = new Hono();

/**
 * POST /api/auth/login
 * Autentica un usuario y retorna un JWT (con rate limiting)
 */
authPublicRoutes.post("/login", async (c) => {
  try {
    const body = await c.req.json();
    const { email } = LoginSchema.parse(body);

    // Rate limiting por IP
    const ip = ipKey(c);
    if (!rateLimit(`login:${ip}`, 5, 15 * 60 * 1000)) {
      throw new AppError("Demasiados intentos. Intente de nuevo en 15 minutos.", "RATE_LIMIT", 429);
    }

    // Buscar usuario
    const [user] = await db.select().from(usuarios).where(eq(usuarios.email, email));

    if (!user) {
      logger.warn(`Intento de login fallido: usuario no encontrado ${email}`);
      throw new AppError("Credenciales inválidas", "INVALID_CREDENTIALS", 401);
    }

    // Verificar contraseña
    const passwordMatch = await bcrypt.compare(body.password, user.passwordHash);
    if (!passwordMatch) {
      logger.warn(`[AUTH] Login fallido: password incorrecto ${email}`);
      throw new AppError("Credenciales inválidas", "INVALID_CREDENTIALS", 401);
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      rol: user.rol,
    });

    setCookie(c, AUTH_COOKIE, token, authCookieOptions);

    setCsrfCookie(c);

    logger.info(`Login exitoso: ${email}`);

    return c.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          nombre: user.email.split("@")[0],
          rol: user.rol,
        },
      },
    });
  } catch (error) {
    throw error;
  }
});

// ============================================================================
// Rutas PROTEGIDAS de autenticación (me, logout)
// ============================================================================

export const authProtectedRoutes = new Hono();

/**
 * GET /api/auth/me
 * Retorna datos del usuario autenticado
 */
authProtectedRoutes.get("/me", async (c) => {
  const user = getCurrentUser(c);

  if (!user) {
    throw new AppError("No autorizado", "UNAUTHORIZED", 401);
  }

  // Obtener datos actualizados del usuario
  const [userData] = await db
    .select()
    .from(usuarios)
    .where(eq(usuarios.id, user.id));

  if (!userData) {
    throw new AppError("Usuario no encontrado", "NOT_FOUND", 404);
  }

  return c.json({
    success: true,
    data: {
      id: userData.id,
      email: userData.email,
      nombre: userData.email.split("@")[0],
      rol: userData.rol,
    },
  });
});

/**
 * POST /api/auth/logout
 * Invalida la sesión (en client-side eliminar token)
 */
authProtectedRoutes.post("/logout", async (c) => {
  const user = getCurrentUser(c);

  if (!user) {
    throw new AppError("No autorizado", "UNAUTHORIZED", 401);
  }

  deleteCookie(c, AUTH_COOKIE, { path: "/" });

  logger.info(`Logout: ${user.email}`);

  return c.json({
    success: true,
    message: "Logout exitoso",
  });
});

/**
 * PUT /api/auth/password
 * Cambia la contraseña del usuario autenticado
 */
const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, "La nueva contraseña debe tener al menos 6 caracteres"),
});

authProtectedRoutes.put("/password", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);

  const body = await c.req.json();
  const { currentPassword, newPassword } = ChangePasswordSchema.parse(body);

  const [userData] = await db.select().from(usuarios).where(eq(usuarios.id, user.id));
  if (!userData) throw new AppError("Usuario no encontrado", "NOT_FOUND", 404);

  const passwordMatch = await bcrypt.compare(currentPassword, userData.passwordHash);
  if (!passwordMatch) throw new AppError("La contraseña actual no es correcta", "INVALID_PASSWORD", 400);

  const newHash = await bcrypt.hash(newPassword, 10);
  await db.update(usuarios).set({ passwordHash: newHash }).where(eq(usuarios.id, user.id));

  logger.info(`[AUTH] Password actualizado: ${user.email}`);
  return c.json({ success: true, message: "Contraseña actualizada exitosamente" });
});
