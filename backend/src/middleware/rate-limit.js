const { AppError } = require("../errors");

function createChatRateLimit({ limit = 3, windowMs = 60_000 } = {}) {
  const buckets = new Map();

  return (req, res, next) => {
    const key = String(req.user.id);
    const timestamp = Date.now();
    const requests = (buckets.get(key) || []).filter((entry) => entry > timestamp - windowMs);
    if (requests.length >= limit) {
      return next(new AppError("Alcanzaste el límite temporal de consultas. Espera un minuto para continuar.", {
        status: 429,
        code: "CHAT_RATE_LIMIT"
      }));
    }
    requests.push(timestamp);
    buckets.set(key, requests);
    next();
  };
}

module.exports = { createChatRateLimit };
