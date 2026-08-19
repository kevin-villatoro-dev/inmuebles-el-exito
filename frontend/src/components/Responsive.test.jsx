import { render, screen } from "@testing-library/react";
import { CatalogPanel } from "./CatalogPanel";

const filters = { search: "", type: "", location: "", minPrice: "", maxPrice: "" };
const property = {
  id: 1002,
  propertyCode: "B16",
  projectName: "Proyecto Horizonte",
  projectLocation: "Zona Norte",
  type: "Lote",
  status: "disponible",
  area: 135,
  price: 150000,
  location: "Manzana B",
  title: "Lote B16 de 135 m²",
  images: []
};

function mockMatchMedia(width) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: query === `(max-width: ${width}px)`,
      media: query,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    }))
  });
}

describe("Experiencia responsiva", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("property-grid existe y muestra propiedades en escritorio (> 1100px)", () => {
    mockMatchMedia(1400);
    const { container } = render(
      <CatalogPanel filters={filters} loading={false} onApply={jest.fn()} onFiltersChange={jest.fn()} onOpen={jest.fn()} properties={[property]} total={1} />
    );
    const grid = container.querySelector(".property-grid");
    expect(grid).toBeInTheDocument();
    expect(grid.querySelector(".property-card")).toBeInTheDocument();
  });

  test("property-grid usa 2 columnas en tablet (<= 1100px)", () => {
    mockMatchMedia(1100);
    const { container } = render(
      <CatalogPanel filters={filters} loading={false} onApply={jest.fn()} onFiltersChange={jest.fn()} onOpen={jest.fn()} properties={[property, { ...property, id: 1003, propertyCode: "B17" }]} total={2} />
    );
    const grid = container.querySelector(".property-grid");
    expect(grid).toBeInTheDocument();
    expect(grid.querySelectorAll(".property-card")).toHaveLength(2);
  });

  test("property-grid usa 1 columna en móvil (<= 760px)", () => {
    mockMatchMedia(760);
    const { container } = render(
      <CatalogPanel filters={filters} loading={false} onApply={jest.fn()} onFiltersChange={jest.fn()} onOpen={jest.fn()} properties={[property]} total={1} />
    );
    const grid = container.querySelector(".property-grid");
    expect(grid).toBeInTheDocument();
    expect(grid.querySelectorAll(".property-card")).toHaveLength(1);
  });

  test("muestra skeleton de carga con 6 tarjetas", () => {
    const { container } = render(
      <CatalogPanel filters={filters} loading={true} onApply={jest.fn()} onFiltersChange={jest.fn()} onOpen={jest.fn()} properties={[]} total={0} />
    );
    expect(container.querySelectorAll(".property-skeleton")).toHaveLength(6);
    expect(screen.getByText("Actualizando catálogo")).toBeInTheDocument();
  });

  test("muestra empty state cuando no hay resultados", () => {
    render(
      <CatalogPanel filters={filters} loading={false} onApply={jest.fn()} onFiltersChange={jest.fn()} onOpen={jest.fn()} properties={[]} total={0} />
    );
    expect(screen.getByText(/No hay propiedades con esos filtros/i)).toBeInTheDocument();
  });

  test("muestra error con role alert", () => {
    render(
      <CatalogPanel error="Error de red" filters={filters} loading={false} onApply={jest.fn()} onFiltersChange={jest.fn()} onOpen={jest.fn()} properties={[]} total={0} />
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Error de red");
  });
});
