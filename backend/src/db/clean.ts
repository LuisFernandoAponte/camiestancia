import db from "./index.js";
import { sql } from "drizzle-orm";

async function cleanDatabase() {
  try {
    console.log("🧹 Limpiando datos de prueba...");

    const tables = [
      "ingresos_venta",
      "ventas",
      "gastos",
      "finanzas",
      "reproduccion",
      "salud",
      "bovinos",
      "consultor_reglas",
      "insumos",
    ];

    for (const table of tables) {
      await db.execute(sql.raw(`TRUNCATE TABLE ${table} CASCADE`));
      console.log(`  ✅ ${table} vaciada`);
    }

    console.log("\n✨ Base de datos limpia. Tablas y usuarios intactos.");
    console.log("📝 Los usuarios de prueba siguen disponibles para login.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error limpiando base de datos:", error);
    process.exit(1);
  }
}

cleanDatabase();
