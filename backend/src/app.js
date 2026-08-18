const express = require("express");
const cors = require("cors");
const { AppError } = require("./errors");
const { createRepositories } = require("./db/repositories");
const { createCatalogClient, createCatalogService } = require("./services/catalog");
const { createAssistantService } = require("./services/assistant");
const { createChatService } = require("./services/chat");
const { createAuthMiddleware, parseCookies, requireAdmin } = require("./middleware/auth");
const { createChatRateLimit } = require("./middleware/rate-limit");

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function optionalNumber(value, name) {
  if (value === undefined || value === "") return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new AppError(`${name} debe ser un número válido.`, { status: 400, code: "INVALID_FILTER" });
  }
  return parsed;
}

function createApp({ db, config, catalogService, catalogClient, assistantService, logger = console } = {}) {
  if (!db) throw new Error("createApp requiere una conexión SQLite.");
  const repositories = createRepositories(db);
  const activeCatalogService = catalogService || createCatalogService({
    repositories,
    client: catalogClient || createCatalogClient({
      url: config.catalogUrl,
      apiKey: config.catalogApiKey,
      timeoutMs: config.catalogTimeoutMs
    })
  });
  const activeAssistantService = assistantService || createAssistantService({
    apiKey: config.openAiApiKey,
    model: config.openAiModel
  });
  const chatService = createChatService({
    repositories,
    assistantService: activeAssistantService,
    timeoutMs: config.openAiTimeoutMs
  });
  const app = express();
  const auth = createAuthMiddleware(repositories);

  app.use(cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || origin === config.frontendOrigin) return callback(null, true);
      return callback(new AppError("Origen no permitido.", { status: 403, code: "CORS_DENIED" }));
    }
  }));
  app.use(express.json({ limit: "16kb", strict: true }));

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", catalog: repositories.getLastSync() });
  });

  app.get("/api/demo-users", (req, res) => {
    res.json({ data: repositories.listDemoUsers() });
  });

  app.post("/api/demo-login", (req, res, next) => {
    try {
      const userId = Number(req.body?.userId);
      if (!Number.isInteger(userId)) {
        throw new AppError("Selecciona un usuario de demostración.", { status: 400, code: "INVALID_USER" });
      }
      const session = repositories.createSession(userId);
      res.cookie("demo_session", session.token, {
        httpOnly: true,
        sameSite: "lax",
        secure: config.isProduction,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/"
      });
      res.json({ data: { user: session.user, expiresAt: session.expiresAt } });
    } catch (error) {
      next(error);
    }
  });

  app.use("/api", auth);

  app.post("/api/logout", (req, res) => {
    repositories.removeSession(parseCookies(req.headers.cookie).demo_session);
    res.clearCookie("demo_session", { path: "/" });
    res.status(204).end();
  });

  app.get("/api/me", (req, res) => {
    res.json({ data: req.user });
  });

  app.get("/api/properties", (req, res, next) => {
    try {
      const result = repositories.listProperties({
        type: req.query.type,
        minPrice: optionalNumber(req.query.minPrice, "El precio mínimo"),
        maxPrice: optionalNumber(req.query.maxPrice, "El precio máximo"),
        location: req.query.location,
        search: req.query.search,
        page: req.query.page,
        limit: req.query.limit
      });
      res.json({
        data: result.data,
        pagination: { total: result.total, page: result.page, limit: result.limit },
        catalog: repositories.getLastSync()
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/properties/:id", (req, res, next) => {
    try {
      const property = repositories.findPropertyById(Number(req.params.id));
      if (!property) throw new AppError("La propiedad no existe.", { status: 404, code: "PROPERTY_NOT_FOUND" });
      res.json({ data: property });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/catalog/sync", requireAdmin, asyncRoute(async (req, res) => {
    const result = await activeCatalogService.synchronize();
    res.json({ data: result });
  }));

  app.get("/api/conversations", (req, res) => {
    res.json({ data: repositories.listConversations(req.user.id) });
  });

  app.get("/api/conversations/:id", (req, res, next) => {
    try {
      const conversation = repositories.getConversationHistory(Number(req.params.id), req.user.id);
      if (!conversation) throw new AppError("La conversación no existe.", { status: 404, code: "CONVERSATION_NOT_FOUND" });
      res.json({ data: conversation });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/chat", createChatRateLimit(), asyncRoute(async (req, res) => {
    const result = await chatService.execute({
      requestId: req.body?.requestId,
      userId: req.user.id,
      conversationId: req.body?.conversationId ? Number(req.body.conversationId) : null,
      message: req.body?.message
    });
    res.json({ data: result });
  }));

  app.post("/api/interactions/:id/cancel", (req, res, next) => {
    try {
      const result = chatService.cancel({ interactionId: req.params.id, userId: req.user.id });
      res.json({ data: result });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/metrics", requireAdmin, (req, res) => {
    res.json({ data: repositories.getMetrics() });
  });

  app.use((req, res, next) => {
    next(new AppError("Ruta no encontrada.", { status: 404, code: "NOT_FOUND" }));
  });

  app.use((error, req, res, next) => {
    const appError = error instanceof AppError
      ? error
      : new AppError("Ocurrió un error inesperado.", { expose: false });
    if (appError.status >= 500) {
      logger.error?.({ code: appError.code, message: appError.message });
    }
    res.status(appError.status).json({
      error: {
        code: appError.code,
        message: appError.expose ? appError.message : "Ocurrió un error inesperado."
      }
    });
  });

  app.locals.services = { repositories, catalogService: activeCatalogService, chatService };
  return app;
}

module.exports = { createApp };
