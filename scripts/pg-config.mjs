/**
 * Pool settings shared by the app (src/lib/db.ts) and scripts/migrate.mjs.
 *
 * Hosted Postgres (Supabase, Neon) needs TLS. node-postgres treats
 * `sslmode=require` in the URL as "verify the certificate against the system
 * CAs", which fails on Supabase's own CA with "self-signed certificate in
 * certificate chain". So for any non-local host we drop sslmode from the URL
 * and turn on TLS without CA verification. Set DATABASE_SSL=disable to turn TLS
 * off (local Postgres), or DATABASE_SSL=verify to require a trusted certificate.
 *
 * @param {string} url
 * @param {number} max
 */
export function poolConfig(url, max) {
  const mode = (process.env.DATABASE_SSL || "").trim().toLowerCase();
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return { connectionString: url, max };
  }
  const local = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(parsed.hostname);
  if (mode === "disable" || (local && mode !== "verify")) return { connectionString: url, max };
  parsed.searchParams.delete("sslmode");
  return {
    connectionString: parsed.toString(),
    max,
    ssl: mode === "verify" ? { rejectUnauthorized: true } : { rejectUnauthorized: false },
  };
}
