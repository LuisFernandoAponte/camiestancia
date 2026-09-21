import jwt from "jsonwebtoken";
import type { Context } from "hono";

/**
 * Estructura del JWT payload
 */
export interface JWTPayload {
  id: string;
  email: string;
  rol: string;
  iat: number;
  exp: number;
}

const getJwtSecret = () => process.env.JWT_SECRET || "estancia-guayaba-secret-key-2026-secure-default";

/**
 * Genera un token JWT
 */
export function generateToken(payload: Omit<JWTPayload, "iat" | "exp">): string {
  const secret = getJwtSecret();

  return jwt.sign(payload, secret, {
    expiresIn: "24h",
  });
}

/**
 * Verifica y decodifica un token JWT
 */
export function verifyToken(token: string): JWTPayload {
  const secret = getJwtSecret();

  return jwt.verify(token, secret) as JWTPayload;
}

/**
 * Obtiene el usuario actual del contexto
 */
export function getCurrentUser(c: Context): JWTPayload | null {
  const user = c.get("user");
  return user || null;
}

/**
 * Valida que el usuario tenga un rol específico
 */
export function hasRole(user: JWTPayload | null, roles: string[]): boolean {
  if (!user) return false;
  return roles.includes(user.rol);
}

/**
 * Valida que el usuario sea admin o gestor
 */
export function isAdminOrGestor(user: JWTPayload | null): boolean {
  return hasRole(user, ["admin", "gestor"]);
}

/**
 * Valida que el usuario sea admin
 */
export function isAdmin(user: JWTPayload | null): boolean {
  return hasRole(user, ["admin"]);
}
