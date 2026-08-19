import { useEffect, useState, useTransition } from "react";
import { api } from "./api";
import { BrandMark } from "./components/BrandMark";
import { CatalogPanel } from "./components/CatalogPanel";
import { ChatPanel } from "./components/ChatPanel";
import { HistoryPanel } from "./components/HistoryPanel";
import { Icon } from "./components/Icon";
import { MetricsPanel } from "./components/MetricsPanel";
import { ProfileSelect } from "./components/ProfileSelect";
import { PropertyDetail } from "./components/PropertyDetail";

const emptyFilters = { search: "", type: "", location: "", minPrice: "", maxPrice: "" };

function NavButton({ active, icon, label, onClick }) {
  return <button className={`nav-button ${active ? "active" : ""}`} onClick={onClick} type="button"><Icon name={icon} size={19} /><span>{label}</span></button>;
}

export default function App() {
  const [users, setUsers] = useState([]);
  const [user, setUser] = useState(null);
  const [profileError, setProfileError] = useState("");
  const [isSelectingProfile, setIsSelectingProfile] = useState(false);
  const [view, setView] = useState("catalog");
  const [properties, setProperties] = useState([]);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [catalogStatus, setCatalogStatus] = useState(null);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState("");
  const [filters, setFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
  const [isFilterPending, startFilterTransition] = useTransition();
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [chatSeed, setChatSeed] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([api.demoUsers(), api.me().catch(() => null)]).then(([demoUsers, activeUser]) => {
      if (!active) return;
      setUsers(demoUsers);
      setUser(activeUser);
    }).catch(() => {
      if (active) setProfileError("No fue posible cargar los perfiles de demostración.");
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!user) return undefined;
    const controller = new AbortController();
    setCatalogLoading(true);
    setCatalogError("");
    const propertiesRequest = api.properties({ ...appliedFilters, page: 1, limit: 18 });
    const conversationsRequest = api.conversations();
    const metricsRequest = user.role === "admin" ? api.metrics() : Promise.resolve(null);
    Promise.all([propertiesRequest, conversationsRequest, metricsRequest]).then(([catalog, history, dashboard]) => {
      if (controller.signal.aborted) return;
      setProperties(catalog.data);
      setCatalogTotal(catalog.pagination.total);
      setCatalogStatus(catalog.catalog);
      setConversations(history);
      setMetrics(dashboard);
      setCatalogLoading(false);
    }).catch((error) => {
      if (controller.signal.aborted) return;
      setCatalogError(error.message || "No fue posible consultar las propiedades.");
      setCatalogLoading(false);
    });
    return () => controller.abort();
  }, [user, appliedFilters]);

  async function selectProfile(userId) {
    setIsSelectingProfile(true);
    setProfileError("");
    try {
      const result = await api.login(userId);
      setUser(result.user);
      setView("catalog");
    } catch (error) {
      setProfileError(error.message || "No fue posible iniciar el perfil.");
    } finally {
      setIsSelectingProfile(false);
    }
  }

  async function logout() {
    await api.logout().catch(() => undefined);
    setUser(null);
    setProperties([]);
    setConversations([]);
    setCurrentConversation(null);
    setMetrics(null);
    setSelectedProperty(null);
  }

  function changeFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function applyFilters(event) {
    event.preventDefault();
    startFilterTransition(() => setAppliedFilters({ ...filters }));
  }

  async function openProperty(id) {
    const existing = properties.find((property) => property.id === id);
    if (existing) setSelectedProperty(existing);
    try {
      const property = await api.property(id);
      setSelectedProperty(property);
    } catch {
      if (!existing) setCatalogError("No fue posible abrir el detalle de la propiedad.");
    }
  }

  async function selectConversation(id) {
    setHistoryLoading(true);
    try {
      setCurrentConversation(await api.conversation(id));
    } finally {
      setHistoryLoading(false);
    }
  }

  async function sendChat(payload, signal) {
    const result = await api.chat(payload, signal);
    const [history, updatedConversations, updatedMetrics] = await Promise.all([
      api.conversation(result.conversationId),
      api.conversations(),
      user.role === "admin" ? api.metrics() : Promise.resolve(null)
    ]);
    setCurrentConversation(history);
    setConversations(updatedConversations);
    if (updatedMetrics) setMetrics(updatedMetrics);
    return result;
  }

  async function cancelChat(interactionId) {
    const cancelled = await api.cancelInteraction(interactionId);
    const conversationId = currentConversation?.id || cancelled.conversationId;
    if (conversationId) {
      const [history, updatedConversations] = await Promise.all([
        api.conversation(conversationId),
        api.conversations()
      ]);
      setCurrentConversation(history);
      setConversations(updatedConversations);
    }
  }

  async function synchronize() {
    setSyncing(true);
    try {
      await api.synchronize();
      const [catalog, dashboard] = await Promise.all([
        api.properties({ ...appliedFilters, page: 1, limit: 18 }),
        api.metrics()
      ]);
      setProperties(catalog.data);
      setCatalogTotal(catalog.pagination.total);
      setCatalogStatus(catalog.catalog);
      setMetrics(dashboard);
    } catch (error) {
      setCatalogError(error.message || "No fue posible sincronizar el catálogo.");
    } finally {
      setSyncing(false);
    }
  }

  function askAboutProperty(property) {
    setChatSeed(`Cuéntame sobre la propiedad ${property.propertyCode}.`);
    setSelectedProperty(null);
    setView("assistant");
  }

  if (!user) {
    return <ProfileSelect error={profileError} loading={isSelectingProfile} onSelect={selectProfile} users={users} />;
  }

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <BrandMark />
        <nav aria-label="Navegación principal" className="main-nav">
          <NavButton active={view === "catalog"} icon="home" label="Catálogo" onClick={() => setView("catalog")} />
          <NavButton active={view === "assistant"} icon="message" label="Asistente" onClick={() => setView("assistant")} />
          {user.role === "admin" && <NavButton active={view === "metrics"} icon="chart" label="Métricas" onClick={() => setView("metrics")} />}
        </nav>
        <div className="sidebar-foot"><span className="online-dot" />Catálogo local</div>
      </aside>
      <main className="workspace">
        <header className="topbar">
          <p>{catalogStatus?.completedAt ? `Sincronizado ${new Date(catalogStatus.completedAt).toLocaleDateString("es-GT")}` : "Catálogo listo para sincronizar"}</p>
          <button className="user-chip" onClick={logout} type="button"><span>{user.name.split(" ").map((part) => part[0]).join("")}</span><strong>{user.name}</strong><small>Salir</small></button>
        </header>
        {view === "catalog" && <CatalogPanel error={catalogError} filters={filters} loading={catalogLoading || isFilterPending} onApply={applyFilters} onFiltersChange={changeFilter} onOpen={openProperty} properties={properties} total={catalogTotal} />}
        {view === "assistant" && <section className="assistant-layout"><HistoryPanel activeId={currentConversation?.id} conversations={conversations} loading={historyLoading} onNew={() => setCurrentConversation(null)} onSelect={selectConversation} /><ChatPanel conversationId={currentConversation?.id} onCancel={cancelChat} onOpenProperty={openProperty} onSeedConsumed={() => setChatSeed("")} onSend={sendChat} seed={chatSeed} /></section>}
        {view === "metrics" && user.role === "admin" && <MetricsPanel loading={metricsLoading} metrics={metrics} onSynchronize={synchronize} syncStatus={catalogStatus} syncing={syncing} />}
      </main>
      <PropertyDetail onAsk={askAboutProperty} onClose={() => setSelectedProperty(null)} property={selectedProperty} />
    </div>
  );
}
