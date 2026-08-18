import { Icon } from "./Icon";
import { ParcelRail } from "./ParcelRail";
import { PropertyCard } from "./PropertyCard";

function SkeletonCard() {
  return <div className="property-skeleton" aria-hidden="true"><div /><span /><span /><span /></div>;
}

export function CatalogPanel({ properties, filters, loading, error, total, onFiltersChange, onApply, onOpen }) {
  const locations = [...new Set(properties.map((property) => property.projectLocation || property.location).filter(Boolean))];
  return (
    <section className="catalog-panel" aria-labelledby="catalog-title">
      <header className="catalog-hero">
        <div className="catalog-hero-copy">
          <p className="eyebrow">Disponibilidad que se puede comprobar</p>
          <h1 id="catalog-title">Encuentra el siguiente tramo de tu patrimonio.</h1>
          <p>Consulta lotes y casas con datos sincronizados, precios visibles y contexto de proyecto.</p>
        </div>
        <div className="hero-coordinate"><span>14° N</span><i /><span>GTQ</span><strong>{total} activos</strong></div>
      </header>
      <ParcelRail onSelect={onOpen} properties={properties} />
      <form className="filter-board" onSubmit={onApply}>
        <div className="filter-search"><Icon name="search" size={18} /><label className="sr-only" htmlFor="catalog-search">Buscar propiedades</label><input id="catalog-search" onChange={(event) => onFiltersChange("search", event.target.value)} placeholder="Busca por código, proyecto o zona" value={filters.search} /></div>
        <label><span>Tipo</span><select onChange={(event) => onFiltersChange("type", event.target.value)} value={filters.type}><option value="">Todos</option><option value="Lote">Lotes</option><option value="Casa">Casas</option></select></label>
        <label><span>Ubicación</span><select onChange={(event) => onFiltersChange("location", event.target.value)} value={filters.location}><option value="">Todas</option>{locations.map((location) => <option key={location} value={location}>{location}</option>)}</select></label>
        <label><span>Desde Q</span><input inputMode="numeric" min="0" onChange={(event) => onFiltersChange("minPrice", event.target.value)} placeholder="0" type="number" value={filters.minPrice} /></label>
        <label><span>Hasta Q</span><input inputMode="numeric" min="0" onChange={(event) => onFiltersChange("maxPrice", event.target.value)} placeholder="Sin límite" type="number" value={filters.maxPrice} /></label>
        <button className="primary-button filter-button" type="submit">Aplicar filtros <Icon name="arrow" size={16} /></button>
      </form>
      <div className="catalog-results-heading"><div><p className="eyebrow">Resultado de búsqueda</p><h2>{loading ? "Actualizando catálogo" : `${total} propiedades encontradas`}</h2></div><span>{filters.type || "Todas las tipologías"}</span></div>
      {error && <div className="catalog-error" role="alert"><strong>No se pudo cargar el catálogo.</strong><span>{error}</span></div>}
      <div className="property-grid">
        {loading && Array.from({ length: 6 }, (_, index) => <SkeletonCard key={index} />)}
        {!loading && !error && properties.map((property) => <PropertyCard key={property.id} onOpen={onOpen} property={property} />)}
      </div>
      {!loading && !error && properties.length === 0 && <div className="empty-state"><Icon name="search" size={28} /><h2>No hay propiedades con esos filtros.</h2><p>Ajusta el tipo, ubicación o rango de precio para ampliar la búsqueda.</p></div>}
    </section>
  );
}
