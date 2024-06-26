import { Config } from "drizzle-kit";
import "dotenv/config";



export default {
  schema: "./dist/entities/schema.js",
  out: "migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env["DB_URL"]!
  },
  verbose: true
} satisfies Config;