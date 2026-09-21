import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
import * as schema from "./schema.js";

const { Pool } = pkg;

/**
 * Configuración de la conexión a PostgreSQL con Drizzle ORM
 */
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("\n❌ ERROR: DATABASE_URL environment variable is not set");
  console.error("\n📋 Please configure:");
  console.error("   1. Create file /backend/.env");
  console.error("   2. Add: DATABASE_URL=\"postgresql://...\"");
  console.error("   3. Restart the server\n");
  console.error("📋- See .env.example for template");
  console.error("📋- Documentation: backend/SETUP.md\n");
  process.exit(1);
}

const pool = new Pool({
  connectionString,
});

/**
 * Configured Drizzle ORM instance
 */
const db = drizzle(pool, {
  schema,
  logger: false,
});

export default db;
export { pool };