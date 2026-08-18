const { AppError } = require("../errors");

function parseCookies(header = "") {
  return header.split(";").reduce((cookies, part) => {
    const separator = part.indexOf("=");
    if (separator === -1) return cookies;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    cookies[key] = decodeURIComponent(value);
    return cookies;
  }, {});
}

function createAuthMiddleware(repositories) {
  return (req, res, next) => {
    const token = parseCookies(req.headers.cookie).demo_session;
    const user = repositories.getUserForSession(token);
    if (!user) {
      return next(new AppError("Selecciona un usuario demo para continuar.", { status: 401, code: "AUTH_REQUIRED" }));
    }
    req.user = user;
    next();
  };
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return next(new AppError("Esta sección está disponible para el perfil administrativo.", { status: 403, code: "ADMIN_REQUIRED" }));
  }
  next();
}

module.exports = { createAuthMiddleware, parseCookies, requireAdmin };
