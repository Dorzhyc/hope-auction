import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

export function getPool(): Pool {
 if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  if (!global.__pgPool) {
    global.__pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    // 🔍 sanity check — проверяем соединение сразу
    global.__pgPool
      .query("select 1")
      .then(() => {
        console.log("✅ DB connection OK");
      })
      .catch((err) => {
        console.error("❌ DB connection FAILED");
        console.error(err);
      });
  }

  return global.__pgPool;
}
