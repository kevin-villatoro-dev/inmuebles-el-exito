export function ParcelRail({ properties, onSelect }) {
  const groups = properties.reduce((accumulator, property) => {
    const key = property.location || property.projectName || "Disponibilidad";
    accumulator[key] = accumulator[key] || [];
    accumulator[key].push(property);
    return accumulator;
  }, {});

  return (
    <section className="parcel-rail" aria-labelledby="parcel-rail-title">
      <div className="parcel-rail-heading">
        <p className="eyebrow">Pulso del catálogo</p>
        <h2 id="parcel-rail-title">Parcelas en movimiento</h2>
      </div>
      <div className="parcel-tracks">
        {Object.entries(groups).slice(0, 4).map(([location, items]) => (
          <div className="parcel-track" key={location}>
            <span className="parcel-location">{location}</span>
            <div className="parcel-cells">
              {items.slice(0, 8).map((property) => (
                <button
                  aria-label={`Ver ${property.propertyCode}`}
                  className={`parcel-cell ${property.status === "disponible" ? "is-available" : ""}`}
                  key={property.id}
                  onClick={() => onSelect(property.id)}
                  type="button"
                >
                  {property.propertyCode}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
