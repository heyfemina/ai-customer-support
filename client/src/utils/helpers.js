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
  if (Array.isArray(payload?.items)) return payload.items;
  return fallback;
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
  if (/^(https?:|data:|blob:)/i.test(fileUrl)) return fileUrl;

  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
  const serverUrl = (import.meta.env.VITE_SERVER_URL || import.meta.env.VITE_SOCKET_URL || apiUrl.replace(/\/api\/?$/, "")).replace(/\/$/, "");
  const path = fileUrl.startsWith("/") ? fileUrl : `/${fileUrl}`;
  return `${serverUrl}${path}`;
}
