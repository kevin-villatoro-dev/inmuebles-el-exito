import { Component } from "react";
import { Icon } from "./Icon";

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary capturó un error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="error-boundary">
          <Icon name="spark" size={32} />
          <h1>Algo salió mal</h1>
          <p>La aplicación encontró un error inesperado. Puedes intentar recargar la página.</p>
          <button className="primary-button" onClick={() => window.location.reload()} type="button">
            <Icon name="refresh" size={17} /> Recargar página
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}
