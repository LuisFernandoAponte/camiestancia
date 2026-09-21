import { pool } from "../src/db/index.js";

async function main() {
  try {
    const r = await pool.query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = $1)", ["configuracion"]);
    const exists = r.rows[0].exists;

    if (!exists) {
      console.log("Creando tabla configuracion...");
      await pool.query(`CREATE TABLE configuracion (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        clave VARCHAR(100) UNIQUE NOT NULL,
        valor TEXT NOT NULL DEFAULT '',
        tipo VARCHAR(20) NOT NULL DEFAULT 'text',
        descripcion TEXT NOT NULL DEFAULT '',
        grupo VARCHAR(50) NOT NULL DEFAULT 'general',
        opciones TEXT,
        editable INTEGER NOT NULL DEFAULT 1,
        orden INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`);
      console.log("Tabla configuracion creada exitosamente");
    } else {
      console.log("Tabla configuracion ya existe");
    }
  } catch (e) {
    console.error("Error:", (e as Error).message);
  }

  await pool.end();
}

main();
