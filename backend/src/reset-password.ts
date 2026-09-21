/**
 * Script para cambiar contraseña de usuario desde CLI.
 * Uso: npx tsx src/reset-password.ts <email> <contraseña>
 *
 * Ejemplo:
 *   npx tsx src/reset-password.ts admin@estanciaguayaba.bo LaEstancia26
 *
 * Usa bcrypt de Node.js (misma librería del backend),
 * evitando problemas de compatibilidad con pgcrypto.
 */

import "dotenv/config";
import db from "./db/index.js";
import { usuarios } from "./db/schema.js";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error("\n❌ Uso: npx tsx src/reset-password.ts <email> <contraseña>\n");
  console.error("   Ejemplo: npx tsx src/reset-password.ts admin@estanciaguayaba.bo LaEstancia26\n");
  process.exit(1);
}

if (password.length < 6) {
  console.error("\n❌ La contraseña debe tener al menos 6 caracteres\n");
  process.exit(1);
}

async function resetPassword() {
  try {
    console.log(`🔍 Buscando usuario: ${email}...`);

    const [user] = await db
      .select({ id: usuarios.id, email: usuarios.email })
      .from(usuarios)
      .where(eq(usuarios.email, email));

    if (!user) {
      const allUsers = await db.select({ email: usuarios.email }).from(usuarios);
      console.error(`\n❌ Usuario no encontrado: ${email}`);
      console.error("   Usuarios disponibles:", allUsers.map(u => u.email).join(", "));
      process.exit(1);
    }

    const displayName = user.email.split("@")[0];
    console.log(`👤 Usuario encontrado: ${displayName} (${user.email})`);
    console.log(`🔐 Generando hash para: ${password}...`);

    const hash = await bcrypt.hash(password, 10);

    await db
      .update(usuarios)
      .set({ passwordHash: hash })
      .where(eq(usuarios.email, email));

    console.log(`\n✅ Contraseña actualizada correctamente para ${email}`);
    console.log(`   Hash: ${hash}\n`);
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Error:", error instanceof Error ? error.message : error, "\n");
    process.exit(1);
  }
}

resetPassword();
