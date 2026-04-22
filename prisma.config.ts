import "dotenv/config";
import { defineConfig } from "prisma/config";

const dbUrl = process.env["DATABASE_URL"] ?? "postgres://placeholder";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: dbUrl,
  },
});