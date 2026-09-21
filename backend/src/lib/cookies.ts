import type { CookieOptions } from "hono/utils/cookie";

const isProduction = process.env.NODE_ENV === "production";

export const AUTH_COOKIE = "auth_token";
export const CSRF_COOKIE = "csrf_token";

export const authCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "None" : "Lax",
  path: "/",
  maxAge: 86400,
};

export const csrfCookieOptions: CookieOptions = {
  httpOnly: false,
  secure: isProduction,
  sameSite: isProduction ? "None" : "Lax",
  path: "/",
};

