import { Icon } from "./Icon";

export function HistoryPanel({ conversations, activeId, loading, onNew, onSelect }) {
  return (
    <aside className="history-panel" aria-label="Historial de conversaciones">
      <div className="history-header">
        <div><p className="eyebrow">Tu historial</p><h2>Conversaciones</h2></div>
        <button aria-label="Nueva conversación" className="icon-button" onClick={onNew} type="button"><Icon name="message" size={18} /></button>
      </div>
      <div className="history-list">
        {loading && <p className="muted small">Cargando historial...</p>}
        {!loading && conversations.length === 0 && <p className="muted small">Aún no hay consultas. Inicia una conversación desde el asistente.</p>}
        {conversations.map((conversation) => (
          <button className={`history-item ${conversation.id === activeId ? "active" : ""}`} key={conversation.id} onClick={() => onSelect(conversation.id)} type="button">
            <span>{conversation.title}</span>
            <small>{conversation.interactionCount} consulta{conversation.interactionCount === 1 ? "" : "s"}</small>
          </button>
        ))}
      </div>
    </aside>
  );
}
