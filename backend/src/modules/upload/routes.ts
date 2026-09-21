import { Hono } from "hono";
import { getCurrentUser } from "@/lib/jwt.js";
import { AppError } from "@/lib/errors.js";
import { uploadImageBuffer } from "@/lib/cloudinary.js";
import logger from "@/utils/logger.js";

export const uploadRoutes = new Hono();

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * POST /api/upload
 * Sube una imagen a Cloudinary de manera segura desde el servidor
 */
uploadRoutes.post("/", async (c) => {
  const user = getCurrentUser(c);
  if (!user) {
    throw new AppError("No autorizado", "UNAUTHORIZED", 401);
  }

  const body = await c.req.parseBody();
  const file = body["file"];
  const folderParam = (body["folder"] as string) || "la_estancia/general";

  if (!file || typeof file === "string") {
    throw new AppError("Archivo de imagen requerido", "VALIDATION_ERROR", 400);
  }

  const mimeType = file.type || "image/jpeg";
  if (!ALLOWED_MIME_TYPES.includes(mimeType.toLowerCase())) {
    throw new AppError("Formato no permitido. Use JPG, PNG, WEBP o GIF.", "INVALID_FILE_TYPE", 400);
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  if (buffer.length > MAX_FILE_SIZE) {
    throw new AppError("El archivo excede el tamaño máximo permitido de 5 MB.", "FILE_TOO_LARGE", 400);
  }

  try {
    const result = await uploadImageBuffer(buffer, folderParam);
    logger.info(`[UPLOAD] Usuario ${user.email} subió imagen: ${result.url}`);

    return c.json({
      success: true,
      data: result,
      message: "Imagen subida exitosamente a Cloudinary",
    });
  } catch (error: any) {
    logger.error(`[UPLOAD] Error procesando archivo: ${error?.message}`);
    throw new AppError(error?.message || "Error al procesar la imagen", "UPLOAD_FAILED", 500);
  }
});

export default uploadRoutes;
