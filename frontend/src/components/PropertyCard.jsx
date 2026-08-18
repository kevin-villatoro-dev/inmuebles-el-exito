import { Icon } from "./Icon";
import { formatCurrency } from "../lib/format";

export function PropertyCard({ property, onOpen }) {
  const image = property.images?.[0];
  return (
    <article className="property-card">
      <button aria-label={`Abrir detalle de ${property.propertyCode}`} className="property-card-hit" onClick={() => onOpen(property.id)} type="button" />
      <div className={`property-image ${image ? "has-image" : ""}`}>
        {image ? <img alt={`Vista de ${property.projectName || property.propertyCode}`} loading="lazy" src={image.url} /> : <span>{property.propertyCode}</span>}
        <span className={`availability ${property.status === "disponible" ? "available" : ""}`}>{property.status || "Sin estado"}</span>
      </div>
      <div className="property-card-body">
        <div className="property-card-meta"><span>{property.type || "Propiedad"}</span><span>{property.projectName || property.location || "Proyecto por confirmar"}</span></div>
        <h3>{property.title}</h3>
        <p className="property-code">{property.propertyCode}</p>
        <div className="property-data">
          <span><Icon name="area" size={16} />{property.area ? `${property.area} m²` : "Área por confirmar"}</span>
          <span><Icon name="location" size={16} />{property.location || "Ubicación por confirmar"}</span>
        </div>
        <div className="property-price"><strong>{formatCurrency(property.price)}</strong><span>Ver detalle <Icon name="arrow" size={15} /></span></div>
      </div>
    </article>
  );
}
