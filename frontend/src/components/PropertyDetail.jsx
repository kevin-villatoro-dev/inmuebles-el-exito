import { useEffect } from "react";
import { Icon } from "./Icon";
import { formatCurrency, formatDate } from "../lib/format";

function DetailItem({ label, value }) {
  if (value === null || value === undefined || value === "") return null;
  return <div><span>{label}</span><strong>{value}</strong></div>;
}

export function PropertyDetail({ property, onClose, onAsk }) {
  useEffect(() => {
    if (!property) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, property]);

  if (!property) return null;
  const images = property.images || [];

  return (
    <div className="detail-backdrop" role="presentation" onMouseDown={onClose}>
      <aside aria-label={`Detalle de ${property.propertyCode}`} aria-modal="true" className="detail-panel" onMouseDown={(event) => event.stopPropagation()} role="dialog">
        <button aria-label="Cerrar detalle" className="icon-button detail-close" onClick={onClose} type="button"><Icon name="close" /></button>
        <div className="detail-hero">
          {images.length ? <img alt={`Galería de ${property.projectName || property.propertyCode}`} src={images[0].url} /> : <div className="detail-placeholder">{property.propertyCode}</div>}
          <span className={`availability ${property.status === "disponible" ? "available" : ""}`}>{property.status || "Sin estado"}</span>
        </div>
        <div className="detail-content">
          <p className="eyebrow">{property.projectName || "Propiedad disponible"}</p>
          <h2>{property.title}</h2>
          <p className="detail-code">{property.propertyCode} · {property.type || "Tipo por confirmar"}</p>
          <p className="detail-price">{formatCurrency(property.price)}</p>
          {property.description && <p className="detail-description">{property.description}</p>}
          {images.length > 1 && <div className="thumbnail-row">{images.slice(1).map((image) => <img alt="" key={image.url} src={image.url} />)}</div>}
          <div className="detail-grid">
            <DetailItem label="Área" value={property.area ? `${property.area} m²` : null} />
            <DetailItem label="Dimensiones" value={property.length && property.width ? `${property.length} × ${property.width} m` : null} />
            <DetailItem label="Ubicación" value={property.location} />
            <DetailItem label="Fase" value={property.phase} />
            <DetailItem label="Fin de obra" value={property.completionDate ? formatDate(property.completionDate) : null} />
            <DetailItem label="Parqueos" value={property.parkingSpaces} />
          </div>
          {property.features && <section className="detail-section"><h3>Características</h3><p>{property.features}</p></section>}
          {property.details && <section className="detail-section"><h3>Detalles técnicos</h3><p>{property.details}</p></section>}
          {property.qualityFlags?.length > 0 && <p className="data-warning">Hay datos del origen que requieren confirmación. El asistente lo indicará si aplica.</p>}
          <button className="primary-button detail-ask" onClick={() => onAsk(property)} type="button"><Icon name="message" size={18} />Preguntar sobre esta propiedad</button>
        </div>
      </aside>
    </div>
  );
}
