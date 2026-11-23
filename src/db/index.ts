import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const databaseGlobal = globalThis as typeof globalThis & { secretSantaPool?: Pool };

// Initialize on first use so builds and UI tests don't need database credentials.
export function getDb() {
  if (!databaseGlobal.secretSantaPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is required for database access.");

    const pool = new Pool({
      connectionString,
      max: 2,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 10_000,
    });
    pool.on("error", () => {
      // Raw driver errors can contain connection details.
      console.error("An idle database connection failed.");
    });
    databaseGlobal.secretSantaPool = pool;
  }

  return drizzle({ client: databaseGlobal.secretSantaPool, schema });
}
