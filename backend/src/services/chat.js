const crypto = require("node:crypto");
const { AppError } = require("../errors");
const { validateChatMessage } = require("./security");

const NO_RESULTS_REPLY = "No encontré información suficiente en el catálogo para responder esa consulta. Puedes indicar un proyecto, código de propiedad, tipo o rango de precio.";
const CANCELLED_REPLY = "Consulta cancelada. Puedes iniciar una nueva búsqueda cuando quieras.";

function isUuid(value) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function sourceSummary(properties, sourceIds) {
  const byId = new Map(properties.map((property) => [property.id, property]));
  return sourceIds.map((id) => byId.get(id)).filter(Boolean).map((property) => ({
    id: property.id,
    propertyCode: property.propertyCode,
    title: property.title,
    projectName: property.projectName,
    price: property.price,
    type: property.type
  }));
}

function createChatService({ repositories, assistantService, timeoutMs = 15000 }) {
  const inFlight = new Map();

  async function execute({ requestId, userId, conversationId, message }) {
    if (!isUuid(requestId)) {
      throw new AppError("La solicitud de chat no es válida.", { status: 400, code: "INVALID_REQUEST_ID" });
    }
    if (repositories.getInteractionForUser(requestId, userId)) {
      throw new AppError("Esta solicitud ya fue registrada.", { status: 409, code: "DUPLICATE_REQUEST" });
    }

    const validation = validateChatMessage(message);
    const pending = repositories.createPendingInteraction({
      id: requestId,
      userId,
      conversationId,
      content: validation.message
    });

    if (validation.safeResponse) {
      repositories.finishInteraction({
        interactionId: requestId,
        status: "respondida",
        content: validation.safeResponse
      });
      return {
        interactionId: requestId,
        conversationId: pending.conversationId,
        status: "respondida",
        answer: validation.safeResponse,
        sources: []
      };
    }

    const recentSourceIds = repositories.getRecentSourceIds(pending.conversationId);
    const properties = repositories.searchRelevantProperties({
      message: validation.message,
      recentSourceIds
    });

    if (!properties.length) {
      repositories.finishInteraction({
        interactionId: requestId,
        status: "respondida",
        content: NO_RESULTS_REPLY
      });
      return {
        interactionId: requestId,
        conversationId: pending.conversationId,
        status: "respondida",
        answer: NO_RESULTS_REPLY,
        sources: []
      };
    }

    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
    inFlight.set(requestId, { controller, userId });

    try {
      const answer = await assistantService.answer({
        question: validation.message,
        properties,
        signal: controller.signal
      });
      const saved = repositories.finishInteraction({
        interactionId: requestId,
        status: "respondida",
        content: answer.answer,
        sourceIds: answer.sourceIds
      });
      if (!saved) {
        return {
          interactionId: requestId,
          conversationId: pending.conversationId,
          status: "cancelada",
          answer: CANCELLED_REPLY,
          sources: []
        };
      }
      return {
        interactionId: requestId,
        conversationId: pending.conversationId,
        status: "respondida",
        answer: answer.answer,
        sources: sourceSummary(properties, answer.sourceIds)
      };
    } catch (error) {
      const interaction = repositories.getInteractionForUser(requestId, userId);
      if (interaction?.status === "cancelada") {
        return {
          interactionId: requestId,
          conversationId: pending.conversationId,
          status: "cancelada",
          answer: CANCELLED_REPLY,
          sources: []
        };
      }
      const isAbort = error.name === "AbortError" || controller.signal.aborted;
      const failure = timedOut || isAbort
        ? new AppError("El asistente tardó demasiado en responder. Intenta de nuevo.", {
            status: 504,
            code: "ASSISTANT_TIMEOUT"
          })
        : error;
      repositories.finishInteraction({
        interactionId: requestId,
        status: "error",
        content: "No fue posible responder esta consulta en este momento. Intenta nuevamente.",
        errorCode: failure.code || "ASSISTANT_ERROR"
      });
      throw failure;
    } finally {
      clearTimeout(timeout);
      inFlight.delete(requestId);
    }
  }

  function cancel({ interactionId, userId }) {
    const interaction = repositories.getInteractionForUser(interactionId, userId);
    if (!interaction) {
      throw new AppError("La consulta no pertenece al usuario activo.", { status: 404, code: "INTERACTION_NOT_FOUND" });
    }
    const active = inFlight.get(interactionId);
    if (active && active.userId !== userId) {
      throw new AppError("La consulta no pertenece al usuario activo.", { status: 404, code: "INTERACTION_NOT_FOUND" });
    }
    if (active) active.controller.abort();
    const changed = repositories.finishInteraction({
      interactionId,
      status: "cancelada",
      content: CANCELLED_REPLY
    });
    return {
      changed,
      status: changed ? "cancelada" : interaction.status,
      conversationId: Number(interaction.conversation_id)
    };
  }

  return { execute, cancel };
}

function createRequestId() {
  return crypto.randomUUID();
}

module.exports = { createChatService, createRequestId };
