import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

const dbUrl = process.env["DATABASE_URL"] ?? "file:./dev.db";
const dbPath = path.resolve(dbUrl.replace("file:", ""));

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: `file:${dbPath}`,
  },
});
