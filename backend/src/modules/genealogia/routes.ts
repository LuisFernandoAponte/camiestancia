import { Hono } from "hono";
import db from "@/db/index.js";
import { bovinos, reproduccion } from "@/db/schema.js";
import { eq, and, sql, inArray } from "drizzle-orm";
import { getCurrentUser } from "@/lib/jwt.js";
import { AppError } from "@/lib/errors.js";
import logger from "@/utils/logger.js";

export const genealogiaRoutes = new Hono();

genealogiaRoutes.get("/arbol/:id", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);

  const id = c.req.param("id");

  try {
    const [animal] = await db
      .select()
      .from(bovinos)
      .where(eq(bovinos.id, id));

    if (!animal) throw new AppError("Animal no encontrado", "NOT_FOUND", 404);

    let madre = null;
    let padre = null;

    if (animal.madreId) {
      [madre] = await db
        .select({
          id: bovinos.id,
          chip: bovinos.chip,
          nombre: bovinos.nombre,
          numeroIdentificacion: bovinos.numeroIdentificacion,
          raza: bovinos.raza,
          color: bovinos.color,
          sexo: bovinos.sexo,
          nacimiento: bovinos.nacimiento,
          estado: bovinos.estado,
        })
        .from(bovinos)
        .where(eq(bovinos.id, animal.madreId));
    }

    if (animal.padreId) {
      [padre] = await db
        .select({
          id: bovinos.id,
          chip: bovinos.chip,
          nombre: bovinos.nombre,
          numeroIdentificacion: bovinos.numeroIdentificacion,
          raza: bovinos.raza,
          color: bovinos.color,
          sexo: bovinos.sexo,
          nacimiento: bovinos.nacimiento,
          estado: bovinos.estado,
        })
        .from(bovinos)
        .where(eq(bovinos.id, animal.padreId));
    }

    const hijos = await db
      .select({
        id: bovinos.id,
        chip: bovinos.chip,
        nombre: bovinos.nombre,
        numeroIdentificacion: bovinos.numeroIdentificacion,
        raza: bovinos.raza,
        color: bovinos.color,
        sexo: bovinos.sexo,
        nacimiento: bovinos.nacimiento,
        estado: bovinos.estado,
        tipo: bovinos.tipo,
      })
      .from(bovinos)
      .where(
        and(
          eq(bovinos.madreId, id),
          sql`${bovinos.id} != ${id}`,
        ),
      );

    const hijosPadre = await db
      .select({
        id: bovinos.id,
        chip: bovinos.chip,
        nombre: bovinos.nombre,
        numeroIdentificacion: bovinos.numeroIdentificacion,
        raza: bovinos.raza,
        color: bovinos.color,
        sexo: bovinos.sexo,
        nacimiento: bovinos.nacimiento,
        estado: bovinos.estado,
        tipo: bovinos.tipo,
      })
      .from(bovinos)
      .where(
        and(
          eq(bovinos.padreId, id),
          sql`${bovinos.id} != ${id}`,
        ),
      );

    return c.json({
      success: true,
      data: {
        animal: {
          id: animal.id,
          chip: animal.chip,
          nombre: animal.nombre,
          numeroIdentificacion: animal.numeroIdentificacion,
          raza: animal.raza,
          color: animal.color,
          sexo: animal.sexo,
          nacimiento: animal.nacimiento,
          estado: animal.estado,
          tipo: animal.tipo,
          descartado: animal.descartado,
        },
        madre,
        padre,
        hijos: [...hijos, ...hijosPadre.filter((h) => !hijos.find((hm) => hm.id === h.id))],
        totalHijos: hijos.length + hijosPadre.length,
      },
    });
  } catch (error) {
    throw error;
  }
});

genealogiaRoutes.get("/hijos-de/:id", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);

  const id = c.req.param("id");

  try {
    const hijos = await db
      .select({
        id: bovinos.id,
        chip: bovinos.chip,
        nombre: bovinos.nombre,
        numeroIdentificacion: bovinos.numeroIdentificacion,
        raza: bovinos.raza,
        sexo: bovinos.sexo,
        nacimiento: bovinos.nacimiento,
        estado: bovinos.estado,
        tipo: bovinos.tipo,
        pesoActual: bovinos.pesoActual,
      })
      .from(bovinos)
      .where(
        and(
          sql`(${bovinos.madreId} = ${id} OR ${bovinos.padreId} = ${id})`,
          sql`${bovinos.id} != ${id}`,
        ),
      )
      .orderBy(bovinos.nacimiento);

    return c.json({
      success: true,
      data: hijos,
      total: hijos.length,
    });
  } catch (error) {
    throw error;
  }
});

genealogiaRoutes.get("/arbol-completo/:id", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);

  const id = c.req.param("id");
  const profundidad = parseInt(c.req.query("profundidad") || "3");

  async function getArbol(animalId: string, nivel: number = 0): Promise<any> {
    if (nivel >= profundidad) return null;

    const [animal] = await db
      .select({
        id: bovinos.id,
        chip: bovinos.chip,
        nombre: bovinos.nombre,
        numeroIdentificacion: bovinos.numeroIdentificacion,
        raza: bovinos.raza,
        sexo: bovinos.sexo,
        nacimiento: bovinos.nacimiento,
        estado: bovinos.estado,
        tipo: bovinos.tipo,
      })
      .from(bovinos)
      .where(eq(bovinos.id, animalId));

    if (!animal) return null;

    const hijos = await db
      .select({ id: bovinos.id })
      .from(bovinos)
      .where(
        and(
          sql`(${bovinos.madreId} = ${animalId} OR ${bovinos.padreId} = ${animalId})`,
          sql`${bovinos.id} != ${animalId}`,
        ),
      );

    const hijosArbol = await Promise.all(
      hijos.map((h) => getArbol(h.id, nivel + 1)),
    );

    let madre = null;
    let padre = null;

    if (animal.madreId) {
      [madre] = await db
        .select({
          id: bovinos.id,
          chip: bovinos.chip,
          nombre: bovinos.nombre,
          numeroIdentificacion: bovinos.numeroIdentificacion,
          raza: bovinos.raza,
        })
        .from(bovinos)
        .where(eq(bovinos.id, animal.madreId));
    }

    if (animal.padreId) {
      [padre] = await db
        .select({
          id: bovinos.id,
          chip: bovinos.chip,
          nombre: bovinos.nombre,
          numeroIdentificacion: bovinos.numeroIdentificacion,
          raza: bovinos.raza,
        })
        .from(bovinos)
        .where(eq(bovinos.id, animal.padreId));
    }

    return {
      ...animal,
      madre,
      padre,
      hijos: hijosArbol.filter(Boolean),
    };
  }

  try {
    const arbol = await getArbol(id);
    return c.json({ success: true, data: arbol });
  } catch (error) {
    throw error;
  }
});

genealogiaRoutes.get("/alertas-parentesco", async (c) => {
  const user = getCurrentUser(c);
  if (!user) throw new AppError("No autorizado", "UNAUTHORIZED", 401);

  try {
    const consanguineos = await db.execute(sql`
      SELECT
        b1.id AS id1, b1.chip AS chip1, b1.nombre AS nombre1,
        b2.id AS id2, b2.chip AS chip2, b2.nombre AS nombre2,
        CASE
          WHEN b1.madre_id = b2.madre_id AND b1.madre_id IS NOT NULL THEN 'misma_madre'
          WHEN b1.padre_id = b2.padre_id AND b1.padre_id IS NOT NULL THEN 'mismo_padre'
          WHEN b1.madre_id = b2.id OR b1.padre_id = b2.id THEN 'padre_hijo'
          ELSE 'otro'
        END AS tipo_parentesco
      FROM bovinos b1
      JOIN bovinos b2 ON b1.id < b2.id
      WHERE (
        (b1.madre_id = b2.madre_id AND b1.madre_id IS NOT NULL)
        OR (b1.padre_id = b2.padre_id AND b1.padre_id IS NOT NULL)
        OR b1.madre_id = b2.id
        OR b1.padre_id = b2.id
      )
      AND b1.estado = 'activo' AND b2.estado = 'activo'
      AND b1.sexo != b2.sexo
      ORDER BY b1.nombre
    `);

    return c.json({
      success: true,
      data: consanguineos.rows,
      total: consanguineos.rows.length,
    });
  } catch (error) {
    throw error;
  }
});

export default genealogiaRoutes;
