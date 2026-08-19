const { AppError } = require("../errors");

const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_PATTERN = /\b(?:\+?502\s*)?(?:\d{4}[\s-]?\d{4})\b/g;
const IDENTIFIER_PATTERN = /\b\d{13}\b/g;
const HTML_TAG_PATTERN = /<[^>]*>/g;
const INJECTION_PATTERN = /\b(ignore|ignora|olvida|revela|muestra|disregard|forget|reveal|show|skip|bypass|override|reveal)\b.{0,50}\b(instrucciones|instructions?|prompt|sistema|system|api[_\s]?key|clave|reglas|rules?|constraints?|límites?|limits?|directrices?|guidelines?)\b|\b(you\s+are\s+now|ahora\s+eres|act\s+como|act\s+as|pretend\s+to\s+be|simula\s+ser)\b/i;
const REAL_ESTATE_PATTERN = /\b(lote|lotes|casa|casas|terreno|terrenos|propiedad|propiedades|proyecto|proyectos|precio|precios|costo|costos|costa|cuánto|cuanto|inversión|inversion|disponib(?:le|les|ilidad)|area|área|metros|m2|m²|manzana|manzanas|habitaciones?|recámaras?|recamaras?|baños?|parqueos?|estacionamiento|jardín|jardin|piscina|amueblado|nuevo|nueva|usado|usada|departamento|apartamento|apartamentos|quinta|finca|local|oficina|bodega|local comercial|zona|zonas|ubicación|ubicacion|dirección|direccion|vecindario|barrio|colonia|sector|zona residencial|zona comercial|zona industrial|precio\s+de\s+venta|renta|alquiler|alquilar|comprar|compra|venta|vender|inmobiliaria|constructora|financiamiento|crédito|credito|hipoteca|enganche|mensualidad|cuota|presupuesto|inversionista|inversor|terreno\b|lote\b|casa\b|apartamento\b|zona\s+\w+|q\s?\d|gtq|[a-z]{1,3}-?\d{1,4})\b/i;

function sanitizeMessage(value) {
  const message = String(value || "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(HTML_TAG_PATTERN, " ")
    .replace(/&[a-z]+;|&#\d+;|&#x[a-f0-9]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return message
    .replace(EMAIL_PATTERN, "[correo omitido]")
    .replace(PHONE_PATTERN, "[teléfono omitido]")
    .replace(IDENTIFIER_PATTERN, "[identificador omitido]");
}

function validateChatMessage(value) {
  const message = sanitizeMessage(value);
  if (message.length < 2) {
    throw new AppError("Escribe una consulta sobre el catálogo.", { status: 400, code: "INVALID_MESSAGE" });
  }
  if (message.length > 1000) {
    throw new AppError("La consulta puede tener hasta 1,000 caracteres.", { status: 400, code: "MESSAGE_TOO_LONG" });
  }
  if (INJECTION_PATTERN.test(message)) {
    return {
      message,
      safeResponse: "Puedo ayudarte con precios, disponibilidad y características del catálogo. No puedo atender instrucciones fuera de ese contexto."
    };
  }
  if (!REAL_ESTATE_PATTERN.test(message)) {
    return {
      message,
      safeResponse: "Puedo ayudarte a consultar propiedades, precios, ubicación, disponibilidad y características del catálogo."
    };
  }
  return { message, safeResponse: null };
}

module.exports = { validateChatMessage };
