import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(8000),

  /** Ohne Datenbank startet der Server trotzdem — dann eben ohne Konten. */
  MONGODB_URI: z.string().optional(),

  /** Signiert die Sitzungen. Beliebige lange Zufallszeichenkette. */
  BETTER_AUTH_SECRET: z.string().optional(),
  // Beide mit Schema, sonst passt der Vergleich mit dem Ursprung des Browsers nicht.
  /** Öffentliche Adresse dieses Servers, für die Rücksprünge der Anbieter. */
  BETTER_AUTH_URL: z.url().default("http://localhost:8000"),
  /** Adresse des Frontends — für CORS und den Rücksprung nach dem Anmelden. */
  WEB_ORIGIN: z.url().default("http://localhost:3000"),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  DISCORD_CLIENT_ID: z.string().optional(),
  DISCORD_CLIENT_SECRET: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("[env] invalid environment variables:", z.treeifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
