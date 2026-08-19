const crypto = require("node:crypto");
const { transaction } = require("./database");
const { AppError } = require("../errors");

const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

function now() {
  return new Date().toISOString();
}

function parseJson(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function mapProperty(row) {
  if (!row) return null;
  return {
    id: Number(row.id),
    propertyCode: row.property_code,
    projectId: row.project_id,
    projectName: row.project_name,
    projectAddress: row.project_address,
    projectLocation: row.project_location,
    type: row.type,
    classType: row.class_type,
    model: row.model,
    area: row.area,
    price: row.price,
    suggestedPrice: row.suggested_price,
    location: row.location,
    status: row.status,
    completionDate: row.completion_date,
    phase: row.phase,
    blockedUntil: row.blocked_until,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    parkingSpaces: row.parking_spaces,
    constructionArea: row.construction_area,
    length: row.length,
    width: row.width,
    year: row.year,
    title: row.title,
    description: row.description,
    details: row.details,
    shortDescription: row.short_description,
    features: row.features,
    latitude: row.latitude,
    longitude: row.longitude,
    images: parseJson(row.images_json, []),
    qualityFlags: parseJson(row.quality_flags_json, []),
    isActive: Boolean(row.is_active),
    syncedAt: row.synced_at
  };
}

function mapUser(row) {
  return row ? { id: Number(row.id), name: row.name, role: row.role } : null;
}

function toNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function createRepositories(db) {
  const getUser = db.prepare("SELECT id, name, role FROM users WHERE id = ?");
  const listUsers = db.prepare("SELECT id, name, role FROM users ORDER BY id");
  const getSession = db.prepare(`
    SELECT users.id, users.name, users.role, demo_sessions.expires_at
    FROM demo_sessions
    JOIN users ON users.id = demo_sessions.user_id
    WHERE demo_sessions.token_hash = ? AND demo_sessions.expires_at > ?
  `);
  const removeExpiredSessions = db.prepare("DELETE FROM demo_sessions WHERE expires_at <= ?");
  const insertSession = db.prepare(`
    INSERT INTO demo_sessions (token_hash, user_id, expires_at, created_at)
    VALUES (?, ?, ?, ?)
  `);
  const deleteSession = db.prepare("DELETE FROM demo_sessions WHERE token_hash = ?");

  const propertyColumns = [
    "id", "property_code", "project_id", "project_name", "project_address", "project_location",
    "type", "class_type", "model", "area", "price", "suggested_price", "location", "status",
    "completion_date", "phase", "blocked_until", "bedrooms", "bathrooms", "parking_spaces",
    "construction_area", "length", "width", "year", "title", "description", "details",
    "short_description", "features", "latitude", "longitude", "images_json", "quality_flags_json",
    "source_json", "source_updated_at", "is_active", "synced_at"
  ];
  const propertyPlaceholders = propertyColumns.map(() => "?").join(", ");
  const updateColumns = propertyColumns.filter((column) => column !== "id").map((column) => `${column} = excluded.${column}`).join(", ");
  const upsertProperty = db.prepare(`
    INSERT INTO properties (${propertyColumns.join(", ")}) VALUES (${propertyPlaceholders})
    ON CONFLICT(id) DO UPDATE SET ${updateColumns}
  `);
  const deactivateProperties = db.prepare("UPDATE properties SET is_active = 0");
  const getPropertyById = db.prepare("SELECT * FROM properties WHERE id = ?");

  const startSync = db.prepare(`
    INSERT INTO sync_runs (status, property_count, started_at) VALUES ('pendiente', 0, ?)
  `);
  const finishSync = db.prepare(`
    UPDATE sync_runs SET status = ?, property_count = ?, error_code = ?, completed_at = ? WHERE id = ?
  `);
  const getLatestSync = db.prepare("SELECT * FROM sync_runs ORDER BY id DESC LIMIT 1");

  const insertConversation = db.prepare(`
    INSERT INTO conversations (user_id, title, created_at, updated_at) VALUES (?, ?, ?, ?)
  `);
  const getConversationForUser = db.prepare("SELECT * FROM conversations WHERE id = ? AND user_id = ?");
  const touchConversation = db.prepare("UPDATE conversations SET updated_at = ?, title = ? WHERE id = ?");
  const touchConversationTimestamp = db.prepare("UPDATE conversations SET updated_at = ? WHERE id = ?");
  const listConversationsForUser = db.prepare(`
    SELECT conversations.*, COUNT(interactions.id) AS interaction_count
    FROM conversations
    LEFT JOIN interactions ON interactions.conversation_id = conversations.id
    WHERE conversations.user_id = ?
    GROUP BY conversations.id
    ORDER BY conversations.updated_at DESC
  `);

  const insertInteraction = db.prepare(`
    INSERT INTO interactions (id, conversation_id, status, started_at) VALUES (?, ?, 'pendiente', ?)
  `);
  const getInteraction = db.prepare(`
    SELECT interactions.*, conversations.user_id
    FROM interactions JOIN conversations ON conversations.id = interactions.conversation_id
    WHERE interactions.id = ?
  `);
  const updateInteractionUserMessage = db.prepare("UPDATE interactions SET user_message_id = ? WHERE id = ?");
  const finishInteractionStatement = db.prepare(`
    UPDATE interactions
    SET status = ?, assistant_message_id = ?, error_code = ?, completed_at = ?
    WHERE id = ? AND status = 'pendiente'
  `);
  const insertMessage = db.prepare(`
    INSERT INTO messages (interaction_id, conversation_id, role, content, created_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertSource = db.prepare(`
    INSERT OR IGNORE INTO message_property_sources (message_id, property_id) VALUES (?, ?)
  `);
  const getRecentSources = db.prepare(`
    SELECT message_property_sources.property_id
    FROM message_property_sources
    JOIN messages ON messages.id = message_property_sources.message_id
    WHERE messages.conversation_id = ? AND messages.role = 'assistant'
    ORDER BY messages.created_at DESC
    LIMIT 5
  `);
  const conversationMessages = db.prepare(`
    SELECT messages.*, interactions.status AS interaction_status, interactions.error_code
    FROM messages
    JOIN interactions ON interactions.id = messages.interaction_id
    WHERE messages.conversation_id = ?
    ORDER BY messages.created_at ASC, messages.id ASC
  `);

  const countConversations = db.prepare("SELECT COUNT(*) AS total FROM conversations");
  const countInteractions = db.prepare("SELECT COUNT(*) AS total FROM interactions");
  const interactionsByStatus = db.prepare("SELECT status, COUNT(*) AS total FROM interactions GROUP BY status");
  const mostConsultedProperty = db.prepare(`
    SELECT properties.id, properties.property_code, properties.title, properties.project_name, COUNT(*) AS total
    FROM message_property_sources
    JOIN properties ON properties.id = message_property_sources.property_id
    GROUP BY properties.id
    ORDER BY total DESC, properties.property_code ASC
    LIMIT 1
  `);

  function createSession(userId) {
    const user = mapUser(getUser.get(userId));
    if (!user) {
      throw new AppError("El usuario de demostración no existe.", { status: 404, code: "USER_NOT_FOUND" });
    }

    const token = crypto.randomBytes(32).toString("base64url");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const createdAt = now();
    const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS).toISOString();
    removeExpiredSessions.run(createdAt);
    insertSession.run(tokenHash, user.id, expiresAt, createdAt);
    return { token, user, expiresAt };
  }

  function getUserForSession(token) {
    if (!token) return null;
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const session = getSession.get(tokenHash, now());
    return session ? mapUser(session) : null;
  }

  function removeSession(token) {
    if (!token) return;
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    deleteSession.run(tokenHash);
  }

  function listDemoUsers() {
    return listUsers.all().map(mapUser);
  }

  function upsertProperties(properties) {
    const syncedAt = now();
    transaction(db, () => {
      deactivateProperties.run();
      for (const property of properties) {
        const values = [
          property.id, property.propertyCode, property.projectId, property.projectName, property.projectAddress,
          property.projectLocation, property.type, property.classType, property.model, property.area, property.price,
          property.suggestedPrice, property.location, property.status, property.completionDate, property.phase,
          property.blockedUntil, property.bedrooms, property.bathrooms, property.parkingSpaces, property.constructionArea,
          property.length, property.width, property.year, property.title, property.description, property.details,
          property.shortDescription, property.features, property.latitude, property.longitude,
          JSON.stringify(property.images), JSON.stringify(property.qualityFlags), JSON.stringify(property.source),
          property.sourceUpdatedAt, 1, syncedAt
        ];
        upsertProperty.run(...values);
      }
    });
    return syncedAt;
  }

  function recordSyncStart() {
    return Number(startSync.run(now()).lastInsertRowid);
  }

  function recordSyncFinish(id, { status, propertyCount = 0, errorCode = null }) {
    finishSync.run(status, propertyCount, errorCode, now(), id);
  }

  function getLastSync() {
    const row = getLatestSync.get();
    return row
      ? {
          status: row.status,
          propertyCount: Number(row.property_count),
          errorCode: row.error_code,
          startedAt: row.started_at,
          completedAt: row.completed_at
        }
      : null;
  }

  function listProperties(filters = {}) {
    const clauses = ["is_active = 1"];
    const values = [];

    if (filters.type) {
      clauses.push("LOWER(type) = LOWER(?)");
      values.push(filters.type);
    }
    if (filters.minPrice !== undefined && filters.minPrice !== null) {
      clauses.push("price >= ?");
      values.push(toNumber(filters.minPrice));
    }
    if (filters.maxPrice !== undefined && filters.maxPrice !== null) {
      clauses.push("price <= ?");
      values.push(toNumber(filters.maxPrice));
    }
    if (filters.location) {
      clauses.push("(LOWER(location) LIKE LOWER(?) OR LOWER(project_location) LIKE LOWER(?) OR LOWER(project_name) LIKE LOWER(?))");
      const pattern = `%${filters.location.trim()}%`;
      values.push(pattern, pattern, pattern);
    }
    if (filters.search) {
      clauses.push(`(
        LOWER(property_code) LIKE LOWER(?) OR LOWER(title) LIKE LOWER(?) OR LOWER(description) LIKE LOWER(?)
        OR LOWER(project_name) LIKE LOWER(?) OR LOWER(location) LIKE LOWER(?)
      )`);
      const pattern = `%${filters.search.trim()}%`;
      values.push(pattern, pattern, pattern, pattern, pattern);
    }

    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(48, Math.max(1, Number(filters.limit) || 12));
    const where = clauses.join(" AND ");
    const total = Number(db.prepare(`SELECT COUNT(*) AS total FROM properties WHERE ${where}`).get(...values).total);
    const rows = db.prepare(`
      SELECT * FROM properties WHERE ${where}
      ORDER BY CASE WHEN status = 'disponible' THEN 0 ELSE 1 END, price ASC, property_code ASC
      LIMIT ? OFFSET ?
    `).all(...values, limit, (page - 1) * limit);

    return { data: rows.map(mapProperty), total, page, limit };
  }

  function findPropertyById(id) {
    return mapProperty(getPropertyById.get(id));
  }

  function findPropertiesByIds(ids) {
    if (!ids.length) return [];
    const placeholders = ids.map(() => "?").join(", ");
    return db.prepare(`SELECT * FROM properties WHERE id IN (${placeholders})`).all(...ids).map(mapProperty);
  }

  function searchRelevantProperties({ message, recentSourceIds = [] }) {
    const normalized = message.toLowerCase();
    const type = /\b(casa|casas)\b/.test(normalized) ? "Casa" : /\b(lote|lotes|terreno|terrenos)\b/.test(normalized) ? "Lote" : null;
    const priceMatch = normalized.match(/(?:menos de|hasta|menor a|por debajo de)\s*(?:q|gtq)?\s*([\d,.]+)/i);
    const minimumPriceMatch = normalized.match(/(?:mas de|más de|desde|mayor a)\s*(?:q|gtq)?\s*([\d,.]+)/i);
    const maxPrice = priceMatch ? Number(priceMatch[1].replace(/[,]/g, "")) : null;
    const minPrice = minimumPriceMatch ? Number(minimumPriceMatch[1].replace(/[,]/g, "")) : null;
    const codeMatches = [...message.matchAll(/\b([a-z]{1,3}-?\d{1,4})\b/gi)].map((match) => match[1]).filter((code) => !/^(q|gtq)/i.test(code));
    const clauses = ["is_active = 1"];
    const values = [];

    if (type) {
      clauses.push("LOWER(type) = LOWER(?)");
      values.push(type);
    }
    if (Number.isFinite(maxPrice)) {
      clauses.push("price <= ?");
      values.push(maxPrice);
    }
    if (Number.isFinite(minPrice)) {
      clauses.push("price >= ?");
      values.push(minPrice);
    }
    if (codeMatches.length) {
      clauses.push(`LOWER(property_code) IN (${codeMatches.map(() => "LOWER(?)").join(", ")})`);
      values.push(...codeMatches);
    }

    const words = normalized.match(/[a-záéíóúñ]{3,}/gi) || [];
    const meaningfulWords = words.filter((word) => !new Set([
      "quiero", "puedes", "puede", "sobre", "para", "menos", "precio", "cuanto", "cuánto", "tiene", "tienen", "lotes", "casa", "casas", "lote", "propiedad", "proyecto", "disponible", "disponibles", "dime", "muestra", "mostrar", "busco", "buscar", "donde", "dónde", "cuales", "cuáles", "hay", "que", "qué", "con", "por", "desde", "mayor", "menor", "hasta", "metros", "area", "área"
    ]).has(word)).slice(0, 4);
    if (!codeMatches.length && meaningfulWords.length) {
      const keywordClauses = meaningfulWords.map(() => "(LOWER(property_code) LIKE LOWER(?) OR LOWER(project_name) LIKE LOWER(?) OR LOWER(location) LIKE LOWER(?) OR LOWER(title) LIKE LOWER(?) OR LOWER(description) LIKE LOWER(?) OR LOWER(features) LIKE LOWER(?))");
      clauses.push(`(${keywordClauses.join(" OR ")})`);
      for (const word of meaningfulWords) {
        const pattern = `%${word}%`;
        values.push(pattern, pattern, pattern, pattern, pattern, pattern);
      }
    }

    let candidates = db.prepare(`
      SELECT * FROM properties WHERE ${clauses.join(" AND ")}
      ORDER BY CASE WHEN status = 'disponible' THEN 0 ELSE 1 END, price ASC
      LIMIT 24
    `).all(...values).map(mapProperty);

    const isFollowUp = /\b(este|esta|esa|ese|anterior|misma|mismo|ella|ello)\b/i.test(normalized);
    if (isFollowUp && recentSourceIds.length) {
      const recent = findPropertiesByIds(recentSourceIds);
      const byId = new Map(candidates.map((property) => [property.id, property]));
      for (const property of recent) byId.set(property.id, property);
      candidates = [...byId.values()];
    }

    return candidates.slice(0, 5);
  }

  function createPendingInteraction({ id, userId, conversationId, content }) {
    const timestamp = now();
    return transaction(db, () => {
      let conversation;
      if (conversationId) {
        conversation = getConversationForUser.get(conversationId, userId);
        if (!conversation) {
          throw new AppError("La conversación no pertenece al usuario activo.", { status: 404, code: "CONVERSATION_NOT_FOUND" });
        }
      } else {
        const title = content.slice(0, 72);
        const result = insertConversation.run(userId, title, timestamp, timestamp);
        conversation = { id: Number(result.lastInsertRowid), title };
      }

      insertInteraction.run(id, conversation.id, timestamp);
      const message = insertMessage.run(id, conversation.id, "user", content, timestamp);
      updateInteractionUserMessage.run(Number(message.lastInsertRowid), id);
      touchConversation.run(timestamp, conversation.title || content.slice(0, 72), conversation.id);
      return { conversationId: Number(conversation.id), interactionId: id };
    });
  }

  function finishInteraction({ interactionId, status, content, sourceIds = [], errorCode = null }) {
    return transaction(db, () => {
      const interaction = getInteraction.get(interactionId);
      if (!interaction || interaction.status !== "pendiente") return false;
      const timestamp = now();
      const message = insertMessage.run(interactionId, interaction.conversation_id, "assistant", content, timestamp);
      const messageId = Number(message.lastInsertRowid);
      const update = finishInteractionStatement.run(status, messageId, errorCode, timestamp, interactionId);
      if (!update.changes) return false;
      for (const propertyId of sourceIds) {
        insertSource.run(messageId, propertyId);
      }
      touchConversationTimestamp.run(timestamp, interaction.conversation_id);
      return true;
    });
  }

  function getInteractionForUser(interactionId, userId) {
    const interaction = getInteraction.get(interactionId);
    if (!interaction || Number(interaction.user_id) !== Number(userId)) return null;
    return interaction;
  }

  function getRecentSourceIds(conversationId) {
    return getRecentSources.all(conversationId).map((row) => Number(row.property_id));
  }

  function getConversationHistory(conversationId, userId, { limit = 20, cursor = null } = {}) {
    const conversation = getConversationForUser.get(conversationId, userId);
    if (!conversation) return null;

    let query = `
      SELECT messages.*, interactions.status AS interaction_status, interactions.error_code
      FROM messages
      JOIN interactions ON interactions.id = messages.interaction_id
      WHERE messages.conversation_id = ?
    `;
    const params = [conversationId];

    if (cursor) {
      query += ` AND messages.id < ?`;
      params.push(cursor);
    }

    query += ` ORDER BY messages.created_at DESC, messages.id DESC LIMIT ?`;
    params.push(limit + 1);

    const allMessages = db.prepare(query).all(...params);
    const hasMore = allMessages.length > limit;
    const messages = hasMore ? allMessages.slice(0, limit) : allMessages;
    const nextCursor = hasMore ? messages[messages.length - 1].id : null;

    const ids = messages.map((message) => Number(message.id));
    const sourcesByMessage = new Map();
    if (ids.length) {
      const placeholders = ids.map(() => "?").join(", ");
      const sources = db.prepare(`
        SELECT message_property_sources.message_id, properties.id, properties.property_code, properties.title,
          properties.project_name, properties.price, properties.type
        FROM message_property_sources
        JOIN properties ON properties.id = message_property_sources.property_id
        WHERE message_property_sources.message_id IN (${placeholders})
      `).all(...ids);
      for (const source of sources) {
        const list = sourcesByMessage.get(Number(source.message_id)) || [];
        list.push({
          id: Number(source.id),
          propertyCode: source.property_code,
          title: source.title,
          projectName: source.project_name,
          price: source.price,
          type: source.type
        });
        sourcesByMessage.set(Number(source.message_id), list);
      }
    }

    const reversedMessages = messages.reverse();
    return {
      id: Number(conversation.id),
      title: conversation.title,
      createdAt: conversation.created_at,
      updatedAt: conversation.updated_at,
      messages: reversedMessages.map((message) => ({
        id: Number(message.id),
        interactionId: message.interaction_id,
        role: message.role,
        content: message.content,
        status: message.interaction_status,
        errorCode: message.error_code,
        createdAt: message.created_at,
        sources: sourcesByMessage.get(Number(message.id)) || []
      })),
      hasMore,
      nextCursor
    };
  }

  function listConversations(userId) {
    return listConversationsForUser.all(userId).map((conversation) => ({
      id: Number(conversation.id),
      title: conversation.title,
      interactionCount: Number(conversation.interaction_count),
      createdAt: conversation.created_at,
      updatedAt: conversation.updated_at
    }));
  }

  function getMetrics() {
    const topProperty = mostConsultedProperty.get();
    return {
      conversations: Number(countConversations.get().total),
      interactions: Number(countInteractions.get().total),
      byStatus: interactionsByStatus.all().reduce((accumulator, row) => {
        accumulator[row.status] = Number(row.total);
        return accumulator;
      }, { pendiente: 0, respondida: 0, error: 0, cancelada: 0 }),
      mostConsultedProperty: topProperty
        ? {
            id: Number(topProperty.id),
            propertyCode: topProperty.property_code,
            title: topProperty.title,
            projectName: topProperty.project_name,
            total: Number(topProperty.total)
          }
        : null
    };
  }

  return {
    createSession,
    getUserForSession,
    removeSession,
    listDemoUsers,
    upsertProperties,
    recordSyncStart,
    recordSyncFinish,
    getLastSync,
    listProperties,
    findPropertyById,
    findPropertiesByIds,
    searchRelevantProperties,
    createPendingInteraction,
    finishInteraction,
    getInteractionForUser,
    getRecentSourceIds,
    getConversationHistory,
    listConversations,
    getMetrics
  };
}

module.exports = { createRepositories, mapProperty };
