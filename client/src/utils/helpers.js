export function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export function formatDate(value) {
  if (!value) return "N/A";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function initials(name = "User") {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function normalizeItems(payload, fallback = []) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.items)) return payload.data.items;
  if (Array.isArray(payload?.data?.tickets)) return payload.data.tickets;
  if (Array.isArray(payload?.data?.users)) return payload.data.users;
  if (Array.isArray(payload?.data?.customers)) return payload.data.customers;
  if (Array.isArray(payload?.data?.chats)) return payload.data.chats;
  if (Array.isArray(payload?.data?.agents)) return payload.data.agents;
  if (Array.isArray(payload?.data?.results)) return payload.data.results;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.tickets)) return payload.tickets;
  if (Array.isArray(payload?.users)) return payload.users;
  if (Array.isArray(payload?.customers)) return payload.customers;
  if (Array.isArray(payload?.chats)) return payload.chats;
  if (Array.isArray(payload?.agents)) return payload.agents;
  if (Array.isArray(payload?.results)) return payload.results;
  return fallback;
}

export function normalizeTotal(payload, items = []) {
  const total =
    payload?.data?.pagination?.total ??
    payload?.pagination?.total ??
    payload?.data?.total ??
    payload?.total ??
    payload?.data?.count ??
    payload?.count;
  const number = Number(total);
  return Number.isFinite(number) ? number : items.length;
}

export function unwrapApiData(responseOrPayload, fallback = {}) {
  return responseOrPayload?.data?.data ?? responseOrPayload?.data ?? responseOrPayload ?? fallback;
}

export function extractItems(responseOrPayload, key, fallback = []) {
  const payload = unwrapApiData(responseOrPayload, {});
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.items)) return payload.items;
  if (key && Array.isArray(payload?.[key])) return payload[key];
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data)) return payload.data;
  return fallback;
}

export function extractTotal(responseOrPayload, key, fallback = 0) {
  const payload = unwrapApiData(responseOrPayload, {});
  const total = payload?.pagination?.total ?? payload?.total ?? payload?.count;
  const number = Number(total);
  return Number.isFinite(number) ? number : extractItems(responseOrPayload, key, []).length || fallback;
}

export function extractArray(responseOrPayload, key, fallback = []) {
  return extractItems(responseOrPayload, key, fallback);
}

export function unwrapData(payload, fallback = null) {
  return payload?.data ?? payload ?? fallback;
}

export function ticketCustomerName(ticket) {
  return ticket.customer?.name || ticket.customerName || "Customer";
}

export function ticketAgentName(ticket) {
  return ticket.agent?.name || ticket.agentName || "Unassigned";
}

export function readableDevice(value = "") {
  if (!value) return "Browser";
  const browser = value.includes("Edg/") ? "Edge" : value.includes("Chrome/") ? "Chrome" : value.includes("Firefox/") ? "Firefox" : value.includes("Safari/") ? "Safari" : "Browser";
  const os = value.includes("Windows") ? "Windows" : value.includes("Mac") ? "macOS" : value.includes("Android") ? "Android" : value.includes("iPhone") || value.includes("iPad") ? "iOS" : "";
  return os ? `${browser} on ${os}` : browser;
}

export function visitorPage(session, fallback = "/support") {
  return session?.visitor?.page || session?.visitorPage || fallback;
}

export function visitorDevice(session) {
  return readableDevice(session?.visitor?.device || session?.visitorDevice || "");
}

export function sortByRecent(items = []) {
  return [...items].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));
}

export function mergeMessages(currentMessages = [], incomingMessages = []) {
  const byId = new Map(currentMessages.map((message) => [message.id, message]));
  incomingMessages.filter(Boolean).forEach((message) => byId.set(message.id, message));
  return Array.from(byId.values()).sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
}

export function resolveFileUrl(fileUrl = "") {
  if (!fileUrl || fileUrl === "#") return fileUrl || "";
  if (/^(data:|blob:)/i.test(fileUrl)) return fileUrl;
  if (/^https?:/i.test(fileUrl)) {
    try {
      const url = new URL(fileUrl);
      url.pathname = url.pathname.replace(/^\/api\/uploads(?=\/|$)/, "/uploads");
      return url.toString();
    } catch {
      return fileUrl.replace(/\/api\/uploads(?=\/|$)/, "/uploads");
    }
  }

  const apiUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  const serverUrl = (import.meta.env.VITE_SERVER_URL || import.meta.env.VITE_SOCKET_URL || apiUrl.replace(/\/api\/?$/, "")).replace(/\/$/, "");
  const rawPath = fileUrl.startsWith("/") ? fileUrl : `/${fileUrl}`;
  const path = rawPath.replace(/^\/api\/uploads(?=\/|$)/, "/uploads");
  return `${serverUrl}${path}`;
}
