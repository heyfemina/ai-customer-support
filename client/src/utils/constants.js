export const ROLES = {
  ADMIN: "ADMIN",
  AGENT: "AGENT",
  CUSTOMER: "CUSTOMER",
};

export const ticketStatusOptions = ["OPEN", "ASSIGNED", "IN_PROGRESS", "WAITING_CUSTOMER", "RESOLUTION_PROPOSED", "CUSTOMER_RESPONDED_AFTER_RESOLUTION", "REOPENED", "AUTO_CLOSED", "CLOSED"];
export const priorityOptions = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export const demoUsers = [];

export const AUTH_TOKEN_KEY = "authToken";
export const AUTH_USER_KEY = "authUser";

export const normalizeRole = (role) => String(role || "").toUpperCase();

export const roleHome = {
  ADMIN: "/admin/dashboard",
  AGENT: "/agent/dashboard",
  CUSTOMER: "/customer/dashboard",
};

export const getDashboardPath = (role) => roleHome[normalizeRole(role)] || "/login";
