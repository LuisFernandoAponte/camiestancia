import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  connectionString: "postgresql://estancia_admin:AdminDB2026!@localhost:5432/laestancia_guayaba",
});

const sql = `
DO $$ BEGIN CREATE TYPE "public"."calidad_seminal" AS ENUM('A', 'S', 'E', 'B'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "public"."color_bovino" AS ENUM('BC', 'CL', 'CO', 'OV', 'NE', 'BR', 'OT'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "public"."resultado_diagnostico" AS ENUM('preñada', 'vacia', 'aborto', 'no_confirmado'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "public"."resultado_iatf" AS ENUM('positivo', 'negativo', 'pendiente'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "public"."tipo_bovino" AS ENUM('vaca', 'vaquilla', 'toro', 'novillo', 'ternero', 'ternera'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "public"."tipo_diagnostico" AS ENUM('tacto', 'ecografia'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "public"."tipo_evento_reproductivo" AS ENUM('servicio_natural', 'iatf', 'parto', 'destete', 'aborto', 'diagnostico'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE "public"."tipo_servicio" AS ENUM('iatf', 'servicio_natural', 'transferencia_embrion'); EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE bovinos ADD COLUMN IF NOT EXISTS numero_identificacion text;
ALTER TABLE bovinos ADD COLUMN IF NOT EXISTS color color_bovino;
ALTER TABLE bovinos ADD COLUMN IF NOT EXISTS tipo tipo_bovino;
ALTER TABLE bovinos ADD COLUMN IF NOT EXISTS madre_id uuid;
ALTER TABLE bovinos ADD COLUMN IF NOT EXISTS padre_id uuid;
ALTER TABLE bovinos ADD COLUMN IF NOT EXISTS descartado boolean DEFAULT false;
ALTER TABLE bovinos ADD COLUMN IF NOT EXISTS motivo_descarte text;
ALTER TABLE bovinos ADD COLUMN IF NOT EXISTS foto text;

ALTER TABLE bovinos ADD CONSTRAINT fk_bovinos_madre FOREIGN KEY (madre_id) REFERENCES bovinos(id) ON DELETE SET NULL;
ALTER TABLE bovinos ADD CONSTRAINT fk_bovinos_padre FOREIGN KEY (padre_id) REFERENCES bovinos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_bovinos_madre ON bovinos (madre_id);
CREATE INDEX IF NOT EXISTS idx_bovinos_padre ON bovinos (padre_id);
CREATE INDEX IF NOT EXISTS idx_bovinos_tipo ON bovinos (tipo);

ALTER TABLE reproduccion ADD COLUMN IF NOT EXISTS toro_id uuid;
ALTER TABLE reproduccion ADD COLUMN IF NOT EXISTS ciclo_numero integer DEFAULT 1;
ALTER TABLE reproduccion ADD COLUMN IF NOT EXISTS resultado resultado_iatf DEFAULT 'pendiente';
ALTER TABLE reproduccion ADD COLUMN IF NOT EXISTS tipo_servicio tipo_servicio DEFAULT 'iatf';
ALTER TABLE reproduccion ADD COLUMN IF NOT EXISTS fecha_diagnostico timestamp;
ALTER TABLE reproduccion ADD COLUMN IF NOT EXISTS observaciones text;

ALTER TABLE reproduccion ADD CONSTRAINT fk_reproduccion_toro FOREIGN KEY (toro_id) REFERENCES bovinos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_reproduccion_hembra ON reproduccion (hembra_id);
CREATE INDEX IF NOT EXISTS idx_reproduccion_ciclo ON reproduccion (ciclo_numero);
CREATE INDEX IF NOT EXISTS idx_reproduccion_resultado ON reproduccion (resultado);
`;

async function main() {
  const client = await pool.connect();
  try {
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    for (const stmt of statements) {
      try {
        await client.query(stmt + ";");
        console.log("✓", stmt.slice(0, 80));
      } catch (err) {
        console.error("✗", stmt.slice(0, 80));
        console.error("  ", err.message);
      }
    }
    console.log("\n✅ Migration completed");
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
