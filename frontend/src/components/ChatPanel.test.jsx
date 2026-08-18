import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ChatPanel } from "./ChatPanel";

function renderChat(overrides = {}) {
  return render(
    <ChatPanel
      conversation={null}
      onCancel={jest.fn()}
      onOpenProperty={jest.fn()}
      onSeedConsumed={jest.fn()}
      onSend={jest.fn().mockResolvedValue({})}
      seed=""
      {...overrides}
    />
  );
}

describe("ChatPanel", () => {
  afterEach(() => {
    delete window.SpeechRecognition;
    delete window.webkitSpeechRecognition;
  });

  test("conserva la caja de texto cuando el navegador no soporta voz", () => {
    renderChat();
    expect(screen.getByLabelText("Consulta sobre el catálogo")).toBeInTheDocument();
    expect(screen.queryByLabelText("Dictar consulta")).not.toBeInTheDocument();
  });

  test("muestra un error amigable si el backend no puede responder", async () => {
    const onSend = jest.fn().mockRejectedValue(new Error("El asistente tardó demasiado en responder."));
    renderChat({ onSend });
    fireEvent.change(screen.getByLabelText("Consulta sobre el catálogo"), { target: { value: "¿Qué cuesta B16?" } });
    fireEvent.click(screen.getByLabelText("Enviar consulta"));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("El asistente tardó demasiado"));
  });

  test("transcribe voz al campo antes de enviarla", async () => {
    class FakeRecognition {
      start() {
        this.onstart();
        this.onresult({
          resultIndex: 0,
          results: [{ 0: { transcript: "Quiero información de B16" }, isFinal: true, length: 1 }]
        });
      }

      stop() {}
    }
    window.SpeechRecognition = FakeRecognition;
    renderChat();
    await waitFor(() => expect(screen.getByLabelText("Dictar consulta")).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText("Dictar consulta"));
    expect(screen.getByLabelText("Consulta sobre el catálogo")).toHaveValue("Quiero información de B16");
  });
});
