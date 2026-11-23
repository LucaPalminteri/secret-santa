import { config } from "dotenv";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import pg from "pg";

config({ path: [".env.local", ".env"], quiet: true });
const [suite, ...args] = process.argv.slice(2);
if (!["integration", "e2e", "e2e-production"].includes(suite)) throw new Error("Choose integration, e2e, or e2e-production.");
let admin;
let temporaryName;

async function run(command, parameters, env, quiet = false) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, parameters, { env, stdio: quiet ? "pipe" : "inherit" });
    if (quiet) { child.stdout.resume(); child.stderr.resume(); }
    child.on("error", () => reject(new Error("Could not start test command.")));
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(quiet ? "Test database migration failed." : "Tests failed.")));
  });
}

try {
  let testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl) {
    if (!process.env.DATABASE_URL_UNPOOLED) throw new Error("Set TEST_DATABASE_URL or DATABASE_URL_UNPOOLED to provision an isolated test database.");
    admin = new pg.Client({ connectionString: process.env.DATABASE_URL_UNPOOLED, connectionTimeoutMillis: 10_000 });
    await admin.connect();
    temporaryName = `secret_santa_test_${randomBytes(8).toString("hex")}`;
    await admin.query(`CREATE DATABASE "${temporaryName}"`);
    const url = new URL(process.env.DATABASE_URL_UNPOOLED);
    url.pathname = `/${temporaryName}`;
    testUrl = url.toString();
    console.log("Created an isolated temporary test database.");
  }
  if (!/^secret_santa_test(?:_[a-z0-9_]+)?$/.test(new URL(testUrl).pathname.slice(1))) {
    throw new Error("Test database name must start with secret_santa_test; refusing to run against application data.");
  }
  const env = { ...process.env, TEST_DATABASE_URL: testUrl, DATABASE_URL: testUrl, DATABASE_URL_UNPOOLED: testUrl, EMAIL_USER: "", EMAIL_PASS: "" };
  env.PLAYWRIGHT_PRODUCTION = suite === "e2e-production" ? "1" : "0";
  await run(process.execPath, ["node_modules/drizzle-kit/bin.cjs", "migrate"], env, true);
  const commandArgs = suite === "integration" ? ["node_modules/vitest/vitest.mjs", "run", "--config", "vitest.integration.config.mts"] : ["node_modules/@playwright/test/cli.js", "test"];
  await run(process.execPath, [...commandArgs, ...args], env);
} catch (error) {
  // Connection strings and raw database errors must not appear in test output.
  console.error(error.code ? `Test database setup failed (${error.code}).` : error.message);
  process.exitCode = 1;
} finally {
  if (admin) {
    try {
      if (temporaryName) { await admin.query(`DROP DATABASE IF EXISTS "${temporaryName}" WITH (FORCE)`); console.log("Removed temporary test database."); }
    } finally { await admin.end(); }
  }
}
