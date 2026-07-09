import dotenv from "dotenv";
import path from "path";
import { execSync } from "child_process";

/**
 * Runs once before the whole suite: make sure the test database schema exists.
 * `prisma db push` creates the database if missing and syncs the schema, so it
 * works both locally and in CI (where DATABASE_URL is provided by the runner).
 */
export default async function globalSetup() {
  dotenv.config({ path: path.resolve(__dirname, "..", ".env.test") });
  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    stdio: "inherit",
    env: process.env,
  });
}
