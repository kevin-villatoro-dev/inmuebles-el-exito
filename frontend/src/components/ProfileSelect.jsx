import { BrandMark } from "./BrandMark";
import { Icon } from "./Icon";

export function ProfileSelect({ users, loading, onSelect, error }) {
  return (
    <main className="profile-shell">
      <section className="profile-intro" aria-labelledby="profile-title">
        <BrandMark />
        <p className="eyebrow">Catálogo con criterio</p>
        <h1 id="profile-title">Una inversión empieza por saber dónde estás parado.</h1>
        <p>Explora disponibilidad real, compara datos y conversa con un asistente que solo responde desde el catálogo.</p>
        <div className="profile-line" aria-hidden="true"><span /><span /><span /><span /><span /></div>
      </section>
      <section className="profile-choice" aria-labelledby="choose-profile-title">
        <p className="eyebrow">Acceso de demostración</p>
        <h2 id="choose-profile-title">Elige tu perspectiva</h2>
        <p className="muted">Cada perfil mantiene su propio historial de conversaciones.</p>
        {error && <p className="inline-error" role="alert">{error}</p>}
        <div className="profile-list">
          {users.map((user) => (
            <button className="profile-option" disabled={loading} key={user.id} onClick={() => onSelect(user.id)} type="button">
              <span className="profile-avatar">{user.name.split(" ").map((part) => part[0]).join("")}</span>
              <span className="profile-copy"><strong>{user.name}</strong><small>{user.role === "admin" ? "Panel administrativo" : "Perfil comprador"}</small></span>
              <Icon name="arrow" size={18} />
            </button>
          ))}
        </div>
        <p className="privacy-note">No compartas datos de contacto en el chat. La voz es opcional y la transcripción depende de tu navegador.</p>
      </section>
    </main>
  );
}
