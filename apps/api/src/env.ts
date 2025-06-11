import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    NODE_ENV: z.string().default("production"),
    R2_ENDPOINT: z.string(),
    R2_ACCESS_KEY_ID: z.string(),
    R2_SECRET_ACCESS_KEY: z.string(),
    R2_BUCKET_NAME: z.string(),
    PORT: z.coerce.number().default(3000),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
