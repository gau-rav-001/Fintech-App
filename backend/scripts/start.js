const { loadEnv, validateProduction } = require("../config/env");
loadEnv();

async function start() {
  validateProduction();
  const db = require("../config/db");
  try {
    await require("../db/run").migrateDatabase(db);
    require("../server");
  } catch (error) {
    await db.pool.end();
    throw error;
  }
}

start().catch(error => {
  console.error("API initialization failed", error.safeMessage || error.code || error.name);
  process.exitCode = 1;
});
