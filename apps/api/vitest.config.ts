import "dotenv/config";
import { defineConfig } from "vitest/config";

const databaseUrl = process.env.DATABASE_URL;
const testDatabaseUrl = process.env.TEST_DATABASE_URL;

if (!databaseUrl || !testDatabaseUrl) {
  throw new Error("DATABASE_URL and TEST_DATABASE_URL must be configured");
}

const developmentDatabase = new URL(databaseUrl);
const testDatabase = new URL(testDatabaseUrl);

if (
  developmentDatabase.href === testDatabase.href ||
  developmentDatabase.pathname === testDatabase.pathname ||
  testDatabase.pathname !== "/flow_studio_test"
) {
  throw new Error("Tests must use the dedicated flow_studio_test database");
}

process.env.DATABASE_URL = testDatabaseUrl;

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    fileParallelism: false,
  },
});
