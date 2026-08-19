import { useEffect, useRef, useState, useCallback } from "react";
import { Icon } from "./Icon";
import { formatCurrency } from "../lib/format";

const MAX_LENGTH = 1000;

function sanitizeInput(value) {
  return value
    .replace(/[\u0000-\u0009\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&[a-z]+;|&#\d+;|&#x[a-f0-9]+;/gi, "");
}

function createRequestId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    return (character === "x" ? random : (random & 0x3) | 0x8).toString(16);
  });
}

function MessageSources({ sources, onOpenProperty }) {
  if (!sources?.length) return null;
  return (
    <div className="message-sources">
      <span>Fuentes</span>
      {sources.map((source) => (
        <button key={source.id} onClick={() => onOpenProperty(source.id)} type="button">
          {source.propertyCode} · {formatCurrency(source.price)}
        </button>
      ))}
    </div>
  );
}

export function ChatPanel({ conversation, seed, onSeedConsumed, onSend, onCancel, onOpenProperty }) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(null);
  const [error, setError] = useState("");
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [voiceState, setVoiceState] = useState("idle");
  const [charWarning, setCharWarning] = useState(false);
  const controllerRef = useRef(null);
  const recognitionRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    setVoiceSupported(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition));
  }, []);

  useEffect(() => {
    if (!seed) return;
    setMessage(seed);
    onSeedConsumed();
  }, [seed, onSeedConsumed]);

  useEffect(() => () => {
    controllerRef.current?.abort();
    recognitionRef.current?.stop();
  }, []);

  const handleInputChange = useCallback((event) => {
    const raw = event.target.value;
    const sanitized = sanitizeInput(raw);
    setMessage(sanitized);
    setCharWarning(sanitized.length > MAX_LENGTH * 0.9 && sanitized.length <= MAX_LENGTH);
  }, []);

  async function submit(event) {
    event.preventDefault();
    const content = sanitizeInput(message).replace(/\r?\n+/g, " ").replace(/\s+/g, " ").trim();
    if (!content || pending) return;
    if (content.length > MAX_LENGTH) {
      setError(`La consulta puede tener hasta ${MAX_LENGTH} caracteres.`);
      return;
    }

    const requestId = createRequestId();
    const controller = new AbortController();
    controllerRef.current = controller;
    setPending({ requestId, content });
    setError("");
    setMessage("");
    try {
      await onSend({ requestId, conversationId: conversation?.id, message: content }, controller.signal);
    } catch (requestError) {
      if (requestError.name !== "AbortError") setError(requestError.message || "No fue posible enviar la consulta.");
    } finally {
      setPending(null);
      controllerRef.current = null;
    }
  }

  async function cancel() {
    if (!pending) return;
    try {
      await onCancel(pending.requestId);
    } catch (cancelError) {
      setError(cancelError.message || "No fue posible cancelar la consulta.");
    } finally {
      controllerRef.current?.abort();
      setPending(null);
    }
  }

  function startVoice() {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Recognition) return;
    const recognition = new Recognition();
    recognition.lang = "es-GT";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onstart = () => setVoiceState("listening");
    recognition.onresult = (event) => {
      let transcript = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        transcript += event.results[index][0].transcript;
      }
      setMessage(sanitizeInput(transcript));
      setVoiceState(event.results[event.results.length - 1].isFinal ? "review" : "listening");
    };
    recognition.onerror = () => setVoiceState("error");
    recognition.onend = () => setVoiceState((current) => current === "error" ? "error" : "review");
    recognitionRef.current = recognition;
    recognition.start();
  }

  const messages = conversation?.messages || [];
  return (
    <section className="chat-panel" aria-labelledby="assistant-title">
      <header className="chat-header">
        <div><p className="eyebrow">Asistente fundamentado</p><h1 id="assistant-title">Pregunta con el catálogo en la mesa.</h1></div>
        <span className="grounding-badge"><Icon name="spark" size={15} />Solo datos recuperados</span>
      </header>
      <div aria-live="polite" className="chat-thread">
        {!messages.length && !pending && (
          <div className="chat-empty">
            <Icon name="message" size={28} />
            <h2>Empieza por una necesidad concreta</h2>
            <p>Prueba: “¿Qué lotes disponibles hay en Veluna por menos de Q200,000?”</p>
          </div>
        )}
        {messages.map((item) => (
          <article className={`message-bubble ${item.role}`} key={item.id}>
            <span className="message-role">{item.role === "user" ? "Tu consulta" : "Inmuebles el Éxito"}</span>
            <p>{item.content}</p>
            {item.role === "assistant" && <MessageSources onOpenProperty={onOpenProperty} sources={item.sources} />}
          </article>
        ))}
        {pending && (
          <>
            <article className="message-bubble user"><span className="message-role">Tu consulta</span><p>{pending.content}</p></article>
            <article className="message-bubble assistant pending"><span className="message-role">Inmuebles el Éxito</span><p><span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" /> Buscando en el catálogo...</p><button onClick={cancel} type="button">Cancelar consulta</button></article>
          </>
        )}
      </div>
      {error && <p className="inline-error" role="alert">{error}</p>}
      <form className="chat-composer" onSubmit={submit}>
        <label className="sr-only" htmlFor="chat-message">Consulta sobre el catálogo</label>
        <div className="textarea-wrapper">
          <textarea
            ref={textareaRef}
            id="chat-message"
            maxLength={MAX_LENGTH}
            onChange={handleInputChange}
            placeholder="Pregunta sobre propiedades, precios, ubicación o disponibilidad..."
            rows="2"
            value={message}
          />
          <span className={`char-counter ${charWarning ? "warning" : ""} ${message.length >= MAX_LENGTH ? "limit" : ""}`}>
            {message.length}/{MAX_LENGTH}
          </span>
        </div>
        <div className="composer-actions">
          <span className="voice-note">{voiceState === "listening" ? "Escuchando..." : voiceState === "review" ? "Revisa la transcripción antes de enviar." : voiceState === "error" ? "No fue posible transcribir. Escribe tu consulta." : "Puedo ayudarte con propiedades, precios y ubicación."}</span>
          <div>
            {voiceSupported && <button aria-label="Dictar consulta" className={`icon-button voice-button ${voiceState === "listening" ? "is-listening" : ""}`} onClick={startVoice} type="button"><Icon name="mic" /></button>}
            <button aria-label="Enviar consulta" className="send-button" disabled={!message.trim() || Boolean(pending)} type="submit"><Icon name="send" /></button>
          </div>
        </div>
      </form>
    </section>
  );
}
