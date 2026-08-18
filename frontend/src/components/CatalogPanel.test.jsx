import { fireEvent, render, screen } from "@testing-library/react";
import { CatalogPanel } from "./CatalogPanel";

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

const filters = { search: "", type: "", location: "", minPrice: "", maxPrice: "" };

describe("CatalogPanel", () => {
  test("muestra propiedades y entrega cambios de filtros", () => {
    const onFiltersChange = jest.fn();
    const onApply = jest.fn((event) => event.preventDefault());
    render(<CatalogPanel filters={filters} loading={false} onApply={onApply} onFiltersChange={onFiltersChange} onOpen={jest.fn()} properties={[property]} total={1} />);

    expect(screen.getByText("Lote B16 de 135 m²")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Buscar propiedades"), { target: { value: "Horizonte" } });
    expect(onFiltersChange).toHaveBeenCalledWith("search", "Horizonte");
    fireEvent.click(screen.getByRole("button", { name: /aplicar filtros/i }));
    expect(onApply).toHaveBeenCalled();
  });

  test("muestra estados de carga, vacío y error recuperable", () => {
    const { container, rerender } = render(<CatalogPanel filters={filters} loading onApply={jest.fn()} onFiltersChange={jest.fn()} onOpen={jest.fn()} properties={[]} total={0} />);
    expect(container.querySelectorAll(".property-skeleton")).toHaveLength(6);

    rerender(<CatalogPanel filters={filters} loading={false} onApply={jest.fn()} onFiltersChange={jest.fn()} onOpen={jest.fn()} properties={[]} total={0} />);
    expect(screen.getByText(/No hay propiedades con esos filtros/i)).toBeInTheDocument();

    rerender(<CatalogPanel error="Intenta actualizar el catálogo." filters={filters} loading={false} onApply={jest.fn()} onFiltersChange={jest.fn()} onOpen={jest.fn()} properties={[]} total={0} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Intenta actualizar el catálogo.");
  });
});
