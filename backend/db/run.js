const migrations = [
  ["001_core", require("./migrate").SQL],
  ["002_financial_ai", require("./migrate_ai").SQL],
  ["003_advisors", require("./migrate_v2").SQL],
  ["004_consultations", require("./migrate_phase7_2").SQL],
  ["005_advisor_workspace", require("node:fs").readFileSync(require("node:path").join(__dirname, "advisor_workspace.sql"), "utf8")],
];

const tables = migrations.flatMap(([, sql]) =>
  Array.from(sql.matchAll(/CREATE TABLE IF NOT EXISTS (\w+)\s*\(/gi), match => match[1])
);

async function schemaReady(client) {
  const { rows } = await client.query(
    "SELECT bool_and(to_regclass('public.' || name) IS NOT NULL) AS ready FROM unnest($1::text[]) AS name",
    [tables]
  );
  if (!rows[0].ready) return false;
  const applied = await client.query(
    "SELECT count(*)::int AS count FROM schema_migrations WHERE version = ANY($1::text[])",
    [migrations.map(([version]) => version)]
  );
  return applied.rows[0].count === migrations.length;
}

async function migrateDatabase(db) {
  await db.transaction(async client => {
    await client.query("SELECT pg_advisory_xact_lock(719042115)");
    await client.query("CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");
    const { rows } = await client.query("SELECT version FROM schema_migrations");
    const applied = new Set(rows.map(row => row.version));
    for (const [version, sql] of migrations) {
      if (applied.has(version)) continue;
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (version) VALUES ($1)", [version]);
    }
    if (!(await schemaReady(client))) throw new Error("Incomplete database schema");
  });
}

if (require.main === module) {
  const db = require("../config/db");
  migrateDatabase(db)
    .then(() => console.log("Database migrations verified."))
    .catch(error => {
      console.error("Database migration failed", error.code || error.name);
      process.exitCode = 1;
    })
    .finally(() => db.pool.end());
}

module.exports = { migrateDatabase, schemaReady };
