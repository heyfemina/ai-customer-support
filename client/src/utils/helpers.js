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
