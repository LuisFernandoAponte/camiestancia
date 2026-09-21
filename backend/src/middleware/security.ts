import { createMiddleware } from "hono/factory";

export const securityHeaders = createMiddleware(async (c, next) => {
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  c.header("X-XSS-Protection", "0");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  await next();
});

const MAX_BODY_SIZE = 1_000_000;

export const bodyLimit = createMiddleware(async (c, next) => {
  const contentLength = c.req.header("content-length");
  if (contentLength && parseInt(contentLength) > MAX_BODY_SIZE) {
    return c.json(
      {
        success: false,
        error: {
          message: "El cuerpo de la solicitud es demasiado grande",
          code: "PAYLOAD_TOO_LARGE",
        },
      },
      413,
    );
  }
  await next();
});
