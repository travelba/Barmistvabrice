import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const files = [
  "supabase/migrations/0001_init.sql",
  "supabase/migrations/0002_ceremony.sql",
  "supabase/migrations/0003_admin_actions.sql",
  "supabase/seed.sql",
];

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL manquant");
  process.exit(1);
}

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  const v = await client.query("select version()");
  console.log("Connecte:", v.rows[0].version.slice(0, 40));
  for (const f of files) {
    const sql = readFileSync(join(root, f), "utf8");
    process.stdout.write(`-> ${f} ... `);
    await client.query(sql);
    console.log("OK");
  }
  const t = await client.query(
    "select table_name from information_schema.tables where table_schema='public' order by table_name",
  );
  console.log("Tables:", t.rows.map((r) => r.table_name).join(", "));
  const h = await client.query("select count(*)::int as n from hotels");
  const rt = await client.query("select count(*)::int as n from room_types");
  console.log(`hotels=${h.rows[0].n} room_types=${rt.rows[0].n}`);
} catch (e) {
  console.error("ERREUR:", e.message);
  process.exitCode = 2;
} finally {
  await client.end();
}
