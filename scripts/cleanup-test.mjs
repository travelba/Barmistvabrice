import pg from "pg";

const c = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await c.connect();
const { rows } = await c.query(
  "select id, group_name, email, status, total_cents, created_at from bookings order by created_at desc",
);
for (const b of rows) {
  console.log(
    `${b.created_at.toISOString?.() ?? b.created_at} | ${b.status} | ${b.group_name} | ${b.email} | ${(b.total_cents / 100).toFixed(2)} EUR | ${b.id}`,
  );
}
await c.end();
