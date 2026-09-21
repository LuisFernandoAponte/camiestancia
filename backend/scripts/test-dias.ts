import { pool } from "../src/db/index.js";
import { sql } from "drizzle-orm";

async function main() {
  const hembras = await pool.query(`SELECT id, nombre FROM bovinos WHERE sexo = 'Hembra' LIMIT 1`);
  const machos = await pool.query(`SELECT id, nombre FROM bovinos WHERE sexo = 'Macho' LIMIT 1`);

  if (!hembras.rows.length || !machos.rows.length) {
    console.log("No hay hembras o machos en la DB. Corré el seed primero.");
    return;
  }

  const h = hembras.rows[0];
  const m = machos.rows[0];
  const hace7dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  await pool.query(
    `INSERT INTO reproduccion (hembra_id, padre_id, fecha_inseminacion, estado) VALUES ($1, $2, $3, 'confirmada')`,
    [h.id, m.id, hace7dias]
  );

  console.log(`Insertado: ${h.nombre} x ${m.nombre} (inseminación: ${hace7dias.split("T")[0]})`);
  console.log("Debería mostrar ~7 días de gestación en la tabla.");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
