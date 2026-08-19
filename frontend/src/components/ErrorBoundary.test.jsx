import { render, screen } from "@testing-library/react";
import { ErrorBoundary } from "./ErrorBoundary";

function Bomb() {
  throw new Error("Error de prueba");
}

describe("ErrorBoundary", () => {
  test("renderiza children cuando no hay error", () => {
    render(
      <ErrorBoundary>
        <p>Contenido normal</p>
      </ErrorBoundary>
    );
    expect(screen.getByText("Contenido normal")).toBeInTheDocument();
  });

  test("muestra fallback amigable cuando un hijo lanza error", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );
    expect(screen.getByText("Algo salió mal")).toBeInTheDocument();
    expect(screen.getByText(/recargar la página/i)).toBeInTheDocument();
    spy.mockRestore();
  });

  test("ofrece botón de recarga", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );
    const button = screen.getByRole("button", { name: /recargar/i });
    expect(button).toBeInTheDocument();
    spy.mockRestore();
  });
});
