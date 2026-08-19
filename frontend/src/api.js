class ApiError extends Error {
  constructor(message, { status, code } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

async function request(path, options = {}, includeEnvelope = false) {
  const response = await fetch(path, {
    credentials: "include",
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...options.headers
    },
    ...options
  });
  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(payload?.error?.message || "No fue posible completar la solicitud.", {
      status: response.status,
      code: payload?.error?.code
    });
  }
  return includeEnvelope ? payload : payload?.data;
}

export const api = {
  demoUsers: () => request("/api/demo-users"),
  login: (userId) => request("/api/demo-login", { method: "POST", body: JSON.stringify({ userId }) }),
  me: () => request("/api/me"),
  logout: () => request("/api/logout", { method: "POST" }),
  properties: (filters = {}) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) {
      if (value !== "" && value !== undefined && value !== null) params.set(key, value);
    }
    return request(`/api/properties?${params.toString()}`, {}, true);
  },
  property: (id) => request(`/api/properties/${id}`),
  synchronize: () => request("/api/catalog/sync", { method: "POST" }),
  conversations: () => request("/api/conversations"),
  conversation: (id, { limit, cursor } = {}) => {
    const params = new URLSearchParams();
    if (limit) params.set("limit", limit);
    if (cursor) params.set("cursor", cursor);
    const query = params.toString();
    return request(`/api/conversations/${id}${query ? `?${query}` : ""}`);
  },
  chat: (payload, signal) => request("/api/chat", { method: "POST", body: JSON.stringify(payload), signal }),
  cancelInteraction: (id) => request(`/api/interactions/${id}/cancel`, { method: "POST" }),
  metrics: () => request("/api/metrics")
};

export { ApiError };
