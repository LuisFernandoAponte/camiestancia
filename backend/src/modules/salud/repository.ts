import { pool } from "@/db/index.js";

export interface SaludRow {
  id: string;
  animal_id: string;
  chip: string;
  nombre_animal: string;
  tipo: string;
  fecha: string;
  proxima_fecha: string | null;
  veterinario: string;
  estado: string;
  notas: string | null;
  created_at: string;
}

export interface CreateSaludInput {
  animal_id: string;
  tipo: string;
  fecha: string;
  proxima_fecha?: string;
  veterinario: string;
  estado: string;
  notas?: string;
}

export interface UpdateSaludInput {
  tipo?: string;
  fecha?: string;
  proxima_fecha?: string;
  veterinario?: string;
  estado?: string;
  notas?: string;
}

export interface DashboardKpis {
  total_eventos: number;
  pendientes: number;
  aplicadas_mes: number;
}

export async function findAll(
  filters: { estado?: string; animal_id?: string; tipo?: string },
  pagination: { page: number; limit: number },
): Promise<{ data: SaludRow[]; total: number }> {
  const conditions: string[] = [];
  const params: any[] = [];
  let idx = 1;

  if (filters.estado) {
    conditions.push(`s.estado = $${idx++}`);
    params.push(filters.estado);
  }
  if (filters.animal_id) {
    conditions.push(`s.animal_id = $${idx++}`);
    params.push(filters.animal_id);
  }
  if (filters.tipo) {
    conditions.push(`s.tipo = $${idx++}`);
    params.push(filters.tipo);
  }

  const where = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

  const countResult = await pool.query(`SELECT COUNT(*) as total FROM salud s ${where}`, params);
  const total = parseInt(countResult.rows[0].total);

  const offset = (pagination.page - 1) * pagination.limit;
  params.push(pagination.limit);
  params.push(offset);

  const { rows } = await pool.query(
    `SELECT s.*, b.chip, b.nombre as nombre_animal
     FROM salud s
     JOIN bovinos b ON s.animal_id = b.id
     ${where}
     ORDER BY s.fecha DESC
     LIMIT $${idx++} OFFSET $${idx}`,
    params,
  );

  return { data: rows, total };
}

export async function findById(id: string): Promise<SaludRow | null> {
  const { rows } = await pool.query(
    `SELECT s.*, b.chip, b.nombre as nombre_animal
     FROM salud s
     JOIN bovinos b ON s.animal_id = b.id
     WHERE s.id = $1`,
    [id],
  );
  return rows[0] || null;
}

export async function findByAnimalId(animalId: string): Promise<SaludRow[]> {
  const { rows } = await pool.query(
    `SELECT s.*, b.chip, b.nombre as nombre_animal
     FROM salud s
     JOIN bovinos b ON s.animal_id = b.id
     WHERE s.animal_id = $1
     ORDER BY s.fecha DESC`,
    [animalId],
  );
  return rows;
}

export async function animalExists(animalId: string): Promise<boolean> {
  const { rows } = await pool.query("SELECT 1 FROM bovinos WHERE id = $1", [animalId]);
  return rows.length > 0;
}

export async function create(input: CreateSaludInput): Promise<SaludRow> {
  const { rows } = await pool.query(
    `INSERT INTO salud (animal_id, tipo, fecha, proxima_fecha, veterinario, estado, notas)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      input.animal_id,
      input.tipo,
      input.fecha,
      input.proxima_fecha || null,
      input.veterinario,
      input.estado,
      input.notas || null,
    ],
  );

  const { rows: joined } = await pool.query(
    `SELECT s.*, b.chip, b.nombre as nombre_animal
     FROM salud s
     JOIN bovinos b ON s.animal_id = b.id
     WHERE s.id = $1`,
    [rows[0].id],
  );

  return joined[0];
}

export async function update(id: string, input: UpdateSaludInput): Promise<SaludRow | null> {
  const fields: string[] = [];
  const params: any[] = [];
  let idx = 1;

  if (input.tipo !== undefined) { fields.push(`tipo = $${idx++}`); params.push(input.tipo); }
  if (input.fecha !== undefined) { fields.push(`fecha = $${idx++}`); params.push(input.fecha); }
  if (input.proxima_fecha !== undefined) { fields.push(`proxima_fecha = $${idx++}`); params.push(input.proxima_fecha); }
  if (input.veterinario !== undefined) { fields.push(`veterinario = $${idx++}`); params.push(input.veterinario); }
  if (input.estado !== undefined) { fields.push(`estado = $${idx++}`); params.push(input.estado); }
  if (input.notas !== undefined) { fields.push(`notas = $${idx++}`); params.push(input.notas); }

  if (fields.length === 0) return null;

  params.push(id);

  const { rows } = await pool.query(
    `UPDATE salud SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
    params,
  );

  if (!rows[0]) return null;

  const { rows: joined } = await pool.query(
    `SELECT s.*, b.chip, b.nombre as nombre_animal
     FROM salud s
     JOIN bovinos b ON s.animal_id = b.id
     WHERE s.id = $1`,
    [rows[0].id],
  );

  return joined[0];
}

export async function remove(id: string): Promise<boolean> {
  const { rowCount } = await pool.query("DELETE FROM salud WHERE id = $1", [id]);
  return (rowCount || 0) > 0;
}

export async function getDashboardKpis(): Promise<DashboardKpis> {
  const total = await pool.query("SELECT COUNT(*) as count FROM salud");
  const pendientes = await pool.query("SELECT COUNT(*) as count FROM salud WHERE estado = 'pendiente'");
  const aplicadasMes = await pool.query(
    `SELECT COUNT(*) as count FROM salud
     WHERE estado = 'aplicado'
     AND EXTRACT(MONTH FROM fecha) = EXTRACT(MONTH FROM CURRENT_DATE)
     AND EXTRACT(YEAR FROM fecha) = EXTRACT(YEAR FROM CURRENT_DATE)`,
  );

  return {
    total_eventos: parseInt(total.rows[0].count),
    pendientes: parseInt(pendientes.rows[0].count),
    aplicadas_mes: parseInt(aplicadasMes.rows[0].count),
  };
}
