const { AppError } = require("../errors");

function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeImages(images) {
  if (!Array.isArray(images)) return [];
  return images
    .filter((image) => image && typeof image.url === "string" && image.url.startsWith("https://"))
    .map((image) => ({ type: image.tipo || "imagen", url: image.url, format: image.formato || "imagen" }));
}

function collectQualityFlags(raw) {
  const flags = [];
  const title = String(raw.titulo || "").toLowerCase();
  const type = String(raw.tipo || "").toLowerCase();
  const dimensionsInTitle = title.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/i);

  if (type === "casa" && /\b(lote|terreno)\b/.test(title)) {
    flags.push("tipo_y_titulo_inconsistentes");
  }
  if (dimensionsInTitle && raw.largo && raw.ancho) {
    const titleLength = Number(dimensionsInTitle[1]);
    const titleWidth = Number(dimensionsInTitle[2]);
    if (titleLength !== Number(raw.largo) || titleWidth !== Number(raw.ancho)) {
      flags.push("dimensiones_y_titulo_inconsistentes");
    }
  }
  return flags;
}

function normalizeProperty(raw) {
  if (!raw || !Number.isInteger(Number(raw.id))) {
    throw new AppError("El catálogo contiene una propiedad sin identificador válido.", {
      status: 502,
      code: "INVALID_CATALOG_RECORD"
    });
  }

  const project = raw.proyecto || {};
  const propertyCode = String(raw.propiedad || raw.id);
  const type = raw.tipo || null;

  return {
    id: Number(raw.id),
    propertyCode,
    projectId: numberOrNull(raw.proyectos_id || project.id),
    projectName: project.nombre_proyecto || null,
    projectAddress: project.direccion || null,
    projectLocation: project.ubicacion || null,
    type,
    classType: raw.clase_tipo || null,
    model: raw.modelo || null,
    area: numberOrNull(raw.area),
    price: numberOrNull(raw.precio),
    suggestedPrice: numberOrNull(raw.precio_sugerido),
    location: raw.ubicacion || null,
    status: raw.estado || null,
    completionDate: raw.fin_de_obra || null,
    phase: raw.fase || null,
    blockedUntil: raw.bloqueo || null,
    bedrooms: numberOrNull(raw.habitaciones),
    bathrooms: numberOrNull(raw.baños),
    parkingSpaces: numberOrNull(raw.parqueos),
    constructionArea: numberOrNull(raw.m2construccion),
    length: numberOrNull(raw.largo),
    width: numberOrNull(raw.ancho),
    year: numberOrNull(raw.año),
    title: raw.titulo || `${type || "Propiedad"} ${propertyCode}`,
    description: raw.descripcion || null,
    details: raw.detalles || null,
    shortDescription: raw.descripcion_corta || null,
    features: raw.caracteristicas || null,
    latitude: numberOrNull(raw.latitud),
    longitude: numberOrNull(raw.longitud),
    images: normalizeImages(raw.imagenes),
    qualityFlags: collectQualityFlags(raw),
    source: raw,
    sourceUpdatedAt: raw.updated_at || null
  };
}

function createCatalogClient({ url, apiKey, timeoutMs = 8000, fetchImpl = global.fetch }) {
  return {
    async fetchCatalog() {
      if (!url || !apiKey) {
        throw new AppError("El catálogo no está configurado.", { status: 503, code: "CATALOG_NOT_CONFIGURED" });
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetchImpl(url, {
          headers: { accept: "application/json", "x-api-key": apiKey },
          signal: controller.signal
        });
        if (!response.ok) {
          throw new AppError("La API de catálogo no respondió correctamente.", {
            status: 502,
            code: "CATALOG_UPSTREAM_ERROR"
          });
        }
        const payload = await response.json();
        if (!payload || payload.success !== true || !Array.isArray(payload.data)) {
          throw new AppError("La API de catálogo devolvió una respuesta incompleta.", {
            status: 502,
            code: "CATALOG_INVALID_RESPONSE"
          });
        }
        return payload.data;
      } catch (error) {
        if (error.name === "AbortError") {
          throw new AppError("La sincronización del catálogo excedió el tiempo de espera.", {
            status: 504,
            code: "CATALOG_TIMEOUT"
          });
        }
        throw error;
      } finally {
        clearTimeout(timeout);
      }
    }
  };
}

function createCatalogService({ repositories, client }) {
  return {
    async synchronize() {
      const syncId = repositories.recordSyncStart();
      try {
        const remoteProperties = await client.fetchCatalog();
        if (remoteProperties.length === 0) {
          throw new AppError("El snapshot del catálogo está vacío; se conserva el último catálogo válido.", {
            status: 502,
            code: "EMPTY_CATALOG_SNAPSHOT"
          });
        }
        const properties = remoteProperties.map(normalizeProperty);
        const syncedAt = repositories.upsertProperties(properties);
        repositories.recordSyncFinish(syncId, {
          status: "respondida",
          propertyCount: properties.length
        });
        return { propertyCount: properties.length, syncedAt };
      } catch (error) {
        repositories.recordSyncFinish(syncId, {
          status: "error",
          errorCode: error.code || "CATALOG_SYNC_ERROR"
        });
        throw error;
      }
    }
  };
}

module.exports = { createCatalogClient, createCatalogService, normalizeProperty };
