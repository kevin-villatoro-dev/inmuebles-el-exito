import { Icon } from "./Icon";

const statusLabels = { pendiente: "Pendientes", respondida: "Respondidas", error: "Con error", cancelada: "Canceladas" };

export function MetricsPanel({ metrics, loading, onSynchronize, syncing, syncStatus }) {
  if (loading) return <section className="metrics-panel"><p className="muted">Calculando métricas...</p></section>;
  const cards = [
    { label: "Conversaciones", value: metrics?.conversations || 0, icon: "message" },
    { label: "Interacciones", value: metrics?.interactions || 0, icon: "chart" },
    { label: "Más consultada", value: metrics?.mostConsultedProperty?.propertyCode || "Sin datos", icon: "home" }
  ];
  return (
    <section className="metrics-panel" aria-labelledby="metrics-title">
      <header className="metrics-header"><div><p className="eyebrow">Panel administrativo</p><h1 id="metrics-title">Lecturas del catálogo</h1><p className="muted">Actividad agregada, sin exponer contenido de conversaciones.</p></div><button className="secondary-button" disabled={syncing} onClick={onSynchronize} type="button"><Icon name="refresh" size={17} />{syncing ? "Sincronizando..." : "Actualizar catálogo"}</button></header>
      {syncStatus && <p className="sync-status">Última sincronización: {syncStatus.completedAt ? new Date(syncStatus.completedAt).toLocaleString("es-GT") : "pendiente"} · {syncStatus.propertyCount || 0} propiedades</p>}
      <div className="metric-cards">{cards.map((card) => <article className="metric-card" key={card.label}><Icon name={card.icon} size={20} /><span>{card.label}</span><strong>{card.value}</strong>{card.label === "Más consultada" && metrics?.mostConsultedProperty && <small>{metrics.mostConsultedProperty.total} referencias</small>}</article>)}</div>
      <section className="status-breakdown"><div><p className="eyebrow">Estado de consultas</p><h2>Distribución actual</h2></div><div className="status-bars">{Object.entries(metrics?.byStatus || {}).map(([status, value]) => <div className="status-row" key={status}><span>{statusLabels[status]}</span><div><i style={{ width: `${Math.min(100, (value / Math.max(metrics?.interactions || 1, 1)) * 100)}%` }} /></div><strong>{value}</strong></div>)}</div></section>
    </section>
  );
}
