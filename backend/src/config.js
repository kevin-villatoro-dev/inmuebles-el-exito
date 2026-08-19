const path = require("node:path");
const { AppError } = require("./errors");

function loadConfig(env = process.env) {
  return {
    port: Number(env.PORT || 4000),
    databasePath: env.DATABASE_PATH
      ? path.resolve(env.DATABASE_PATH)
      : path.resolve(process.cwd(), "data", "inmuebles-el-exito.db"),
    catalogUrl: env.CATALOG_API_URL || "",
    catalogApiKey: env.CATALOG_API_KEY || "",
    openAiApiKey: env.OPENAI_API_KEY || "",
    openAiModel: env.OPENAI_MODEL || "gpt-4o-mini",
    catalogTimeoutMs: Number(env.CATALOG_TIMEOUT_MS || 8000),
    openAiTimeoutMs: Number(env.OPENAI_TIMEOUT_MS || 15000),
    frontendOrigin: env.FRONTEND_ORIGIN || "http://localhost:5173",
    isProduction: env.NODE_ENV === "production"
  };
}

function requireRuntimeSecrets(config) {
  const missing = [];

  if (!config.catalogUrl) missing.push("CATALOG_API_URL");
  if (!config.catalogApiKey) missing.push("CATALOG_API_KEY");
  if (!config.openAiApiKey) missing.push("OPENAI_API_KEY");

  if (missing.length) {
    throw new AppError(`Faltan variables requeridas: ${missing.join(", ")}.`, {
      status: 500,
      code: "MISSING_CONFIGURATION",
      expose: true
    });
  }
}

module.exports = { loadConfig, requireRuntimeSecrets };
