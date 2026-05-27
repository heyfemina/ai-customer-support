export const ROLES = {
  ADMIN: "ADMIN",
  AGENT: "AGENT",
  CUSTOMER: "CUSTOMER",
};

export const ticketStatusOptions = ["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER", "RESOLVED", "CLOSED"];
export const priorityOptions = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export const demoUsers = [
  { email: "admin@example.com", password: "123456", role: ROLES.ADMIN, name: "Ariana Admin" },
  { email: "agent@example.com", password: "agent123", role: ROLES.AGENT, name: "Marco Agent" },
  { email: "customer@example.com", password: "customer123", role: ROLES.CUSTOMER, name: "Clara Customer" },
];

export const roleHome = {
  ADMIN: "/admin/dashboard",
  AGENT: "/agent/dashboard",
  CUSTOMER: "/customer/dashboard",
};
