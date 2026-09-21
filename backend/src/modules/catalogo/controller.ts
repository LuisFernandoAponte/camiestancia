import db from "@/db/index.js";
import { bovinos } from "@/db/schema.js";
import { eq, ilike, or, and, ne } from "drizzle-orm";

export async function listCatalogo(filters: { q?: string; raza?: string; tipo?: string; sexo?: string }) {
  const { q, raza, tipo, sexo } = filters;

  // Ganado disponible o activo (no vendido ni fallecido ni descartado)
  const conditions: any[] = [
    ne(bovinos.estado, "vendido"),
    ne(bovinos.estado, "fallecido"),
    eq(bovinos.descartado, false),
  ];

  if (raza && raza !== "todas") {
    conditions.push(eq(bovinos.raza, raza));
  }

  if (tipo && tipo !== "todos") {
    conditions.push(eq(bovinos.tipo, tipo as any));
  }

  if (sexo && sexo !== "todos") {
    conditions.push(eq(bovinos.sexo, sexo));
  }

  if (q) {
    const searchPattern = `%${q}%`;
    conditions.push(
      or(
        ilike(bovinos.chip, searchPattern),
        ilike(bovinos.nombre, searchPattern),
        ilike(bovinos.raza, searchPattern),
        ilike(bovinos.potrero, searchPattern),
      ) as any,
    );
  }

  const where = and(...conditions);

  const data = await db.select().from(bovinos).where(where);

  return {
    success: true as const,
    data: data.map((b) => ({
      id: b.id,
      chip: b.chip,
      nombre: b.nombre,
      raza: b.raza,
      sexo: b.sexo,
      tipo: b.tipo,
      nacimiento: b.nacimiento,
      pesoInicial: b.pesoInicial ? parseFloat(b.pesoInicial) : 0,
      pesoActual: b.pesoActual ? parseFloat(b.pesoActual) : 0,
      potrero: b.potrero,
      estado: b.estado,
      precio: b.precio ? parseFloat(b.precio) : null,
      foto: b.foto,
      fotoUrl: b.foto,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    })),
  };
}
