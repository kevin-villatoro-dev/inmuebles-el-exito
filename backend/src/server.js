const dotenv = require("dotenv");
dotenv.config();

const { loadConfig, requireRuntimeSecrets } = require("./config");
const { createDatabase } = require("./db/database");
const { createApp } = require("./app");

async function start() {
  const config = loadConfig();
  requireRuntimeSecrets(config);
  const db = createDatabase(config.databasePath);
  const app = createApp({ db, config });
  const server = app.listen(config.port, () => {
    console.info(`API disponible en http://localhost:${config.port}`);
  });

  app.locals.services.catalogService.synchronize().catch((error) => {
    console.error(`No se pudo sincronizar el catálogo al iniciar: ${error.code || "CATALOG_SYNC_ERROR"}`);
  });

  const shutdown = () => {
    server.close(() => {
      db.close();
      process.exit(0);
    });
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

if (require.main === module) {
  start().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = { start };
