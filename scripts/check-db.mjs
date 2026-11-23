import { config } from "dotenv";
import pg from "pg";

config({ path: [".env.local", ".env"], quiet: true });

// Only print labels and error codes; never print URLs, passwords, or raw errors.
for (const variable of ["DATABASE_URL", "DATABASE_URL_UNPOOLED"]) {
  const connectionString = process.env[variable];
  if (!connectionString) {
    console.error(`${variable}: missing`);
    process.exitCode = 1;
    continue;
  }

  let client;
  try {
    client = new pg.Client({ connectionString, connectionTimeoutMillis: 10_000, query_timeout: 10_000 });
    await client.connect();
    await client.query("SELECT 1");
    console.log(`${variable}: connected; SELECT 1 succeeded`);
  } catch (error) {
    const code = typeof error?.code === "string" && /^[A-Z0-9_]+$/.test(error.code)
      ? error.code : "CONNECTION_FAILED";
    console.error(`${variable}: failed (${code})`);
    process.exitCode = 1;
  } finally {
    await client?.end();
  }
}
