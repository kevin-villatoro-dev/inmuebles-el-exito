class AppError extends Error {
  constructor(message, { status = 500, code = "INTERNAL_ERROR", expose = true } = {}) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.expose = expose;
  }
}

module.exports = { AppError };
