import { type Config } from "drizzle-kit";
import { config } from "dotenv";

config({ path: "../../.env.local" });

export default {
  schema: "./src/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  tablesFilter: ["cover-game_*"],
} satisfies Config;
