import type { Context } from "hono";
import { ZodError } from "zod";
import logger from "@/utils/logger.js";

/**
 * Error personalizado de la aplicación
 */
export class AppError extends Error {
  constructor(
    public message: string,
    public code: string,
    public status: number = 500,
    public details?: any,
  ) {
    super(message);
  }
}

/**
 * Middleware global de error handling
 */
export async function errorHandler(error: Error, c: Context) {
  // Errores de validación Zod
  if (error instanceof ZodError) {
    logger.warn("Validación fallida:", error.errors);
    return c.json(
      {
        success: false,
        error: {
          message: "Validación fallida",
          code: "VALIDATION_ERROR",
          details: error.errors.map((e) => ({
            path: e.path.join("."),
            message: e.message,
          })),
        },
      },
      400,
    );
  }

  // Errores de aplicación personalizados
  if (error instanceof AppError) {
    logger.error(`${error.code}: ${error.message}`);
    return c.json(
      {
        success: false,
        error: {
          message: error.message,
          code: error.code,
          details: error.details,
        },
      },
      error.status,
    );
  }

  // Errores genéricos
  logger.error("Error no manejado:", error);
  return c.json(
    {
      success: false,
      error: {
        message: "Error interno del servidor",
        code: "INTERNAL_ERROR",
      },
    },
    500,
  );
}

/**
 * Wrapper para handlers seguros
 */
export function handleRoute(handler: (c: Context) => Promise<Response>) {
  return async (c: Context) => {
    try {
      return await handler(c);
    } catch (error) {
      return errorHandler(error as Error, c);
    }
  };
}
