import { chats, messages, tickets, users } from "./dummyData.js";

const keys = {
  tickets: "demo:tickets",
  users: "demo:users",
  chats: "demo:chats",
  aiSettings: "demo:ai-settings",
  integrations: "demo:integrations",
  security: "demo:security",
};

const defaults = {
  aiSettings: {
    botName: "Support AI",
    welcomeMessage: "Hello, I can help with tickets, account questions, and quick troubleshooting.",
    fallbackMessage: "I will transfer you to an agent so we can resolve this properly.",
    isActive: true,
    autoTranslate: true,
    handoffAfterFailedReplies: 2,
    supportedLanguages: ["en", "it", "es", "fr"],
    regionalNotes: "Use formal Italian for billing, concise English for technical support, neutral Spanish for onboarding, and polite French for complaints.",
    regionalProfiles: {
      en: "US English, concise support tone",
      it: "Italian, formal billing tone",
      es: "Spanish, neutral regional tone",
      fr: "French, polite complaint handling",
    },
  },
  integrations: [
    { id: "whatsapp", title: "WhatsApp API", text: "Business number, webhook URL, access token, template sync", isActive: false, status: "Pending API keys", config: { phoneNumberId: "", webhookUrl: "", accessToken: "", templateNamespace: "" } },
    { id: "chatbot", title: "Website chatbot", text: "Embed key, domains, AI handoff trigger, visitor tracking", isActive: true, status: "Demo widget ready", config: { embedKey: "demo-widget-key", allowedDomains: "localhost, example.com", handoffTrigger: "human, agent, billing", visitorTracking: true } },
    { id: "email", title: "Email system", text: "SMTP host, sender address, test mail, ticket ingestion", isActive: false, status: "Pending SMTP details", config: { smtpHost: "", smtpPort: "587", senderEmail: "", inboundAddress: "" } },
  ],
  security: [
    { id: "auth", title: "Secure user authentication", state: "Active", enabled: true, detail: "JWT sessions, password hashing, inactive-user blocking" },
    { id: "roles", title: "Role-based access control", state: "Active", enabled: true, detail: "Admin, agent, and customer route permissions" },
    { id: "encryption", title: "Data encryption", state: "Ready", enabled: true, detail: "Encrypted transport and encrypted-message indicators" },
    { id: "twoFactor", title: "Two-factor authentication", state: "Ready", enabled: false, detail: "User profile flag ready for OTP provider setup" },
    { id: "backup", title: "Secure cloud backup", state: "Ready", enabled: true, detail: "Manual secure backup action available in demo mode" },
    { id: "activity", title: "Activity logs", state: "Active", enabled: true, detail: "Admin changes and auth events are auditable" },
    { id: "gdpr", title: "GDPR compliance", state: "Ready", enabled: true, detail: "Data export and deletion workflow placeholders" },
    { id: "firewall", title: "Firewall protection", state: "Ready", enabled: true, detail: "Helmet headers, CORS policy, and rate limiting" },
    { id: "apiSecurity", title: "API security", state: "Active", enabled: true, detail: "Protected API routes and request throttling" },
  ],
  activityLogs: [
    { id: "a1", user: "Ariana Admin", action: "Updated AI fallback message", ipAddress: "192.168.1.20", createdAt: "2026-05-26T08:20:00.000Z" },
    { id: "a2", user: "Marco Agent", action: "Transferred chat chat-2", ipAddress: "192.168.1.21", createdAt: "2026-05-26T08:10:00.000Z" },
    { id: "a3", user: "Clara Customer", action: "Created ticket tck-1004", ipAddress: "192.168.1.22", createdAt: "2026-05-25T16:12:00.000Z" },
  ],
};

function read(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
  return value;
}

function enrichChats(items) {
  return items.map((chat, index) => ({
    channel: "Website chatbot",
    encrypted: true,
    queuePosition: chat.status === "WAITING" ? index + 1 : 0,
    visitor: {
      ip: `192.168.1.${42 + index}`,
      page: index === 1 ? "/pricing" : "/support",
      device: index === 2 ? "Mobile Safari" : "Desktop Chrome",
      visits: 3 + index,
    },
    ...chat,
    messages: chat.messages || [],
  }));
}

export const demoStore = {
  tickets: () => read(keys.tickets, tickets),
  saveTickets: (items) => write(keys.tickets, items),
  createTicket: (payload) => {
    const items = demoStore.tickets();
    const ticket = {
      id: `tck-${Date.now()}`,
      status: "OPEN",
      customerName: "Clara Customer",
      agentName: "Unassigned",
      createdAt: new Date().toISOString(),
      messages: [],
      ...payload,
    };
    return write(keys.tickets, [ticket, ...items])[0];
  },
  updateTicket: (id, updates) => {
    let nextTicket = null;
    const updated = demoStore.tickets().map((ticket) => {
      if (ticket.id !== id) return ticket;
      nextTicket = { ...ticket, ...updates };
      return nextTicket;
    });
    write(keys.tickets, updated);
    return nextTicket || updated[0];
  },
  addTicketReply: (id, reply) => {
    const message = { id: `reply-${Date.now()}`, createdAt: new Date().toISOString(), ...reply };
    const ticket = demoStore.updateTicket(id, {
      messages: [...(demoStore.tickets().find((item) => item.id === id)?.messages || []), message],
      status: "IN_PROGRESS",
    });
    return { ticket, message };
  },
  users: () => read(keys.users, users),
  saveUsers: (items) => write(keys.users, items),
  chats: () => enrichChats(read(keys.chats, chats.map((chat, index) => ({
    ...chat,
    channel: "Website chatbot",
    encrypted: true,
    queuePosition: chat.status === "WAITING" ? index + 1 : 0,
    visitor: {
      ip: `192.168.1.${42 + index}`,
      page: index === 1 ? "/pricing" : "/support",
      device: index === 2 ? "Mobile Safari" : "Desktop Chrome",
      visits: 3 + index,
    },
    messages: index === 0 ? messages : [],
  })))),
  saveChats: (items) => write(keys.chats, items),
  updateChat: (id, updates) => {
    let nextChat = null;
    const updated = demoStore.chats().map((chat) => {
      if (chat.id !== id) return chat;
      nextChat = { ...chat, ...updates, updatedAt: new Date().toISOString() };
      return nextChat;
    });
    write(keys.chats, updated);
    return nextChat || updated[0];
  },
  addChatMessage: (id, message) => {
    const chat = demoStore.chats().find((item) => item.id === id);
    const nextMessage = { id: `msg-${Date.now()}`, createdAt: new Date().toISOString(), ...message };
    const updated = demoStore.updateChat(id, {
      messages: [...(chat?.messages || []), nextMessage],
      lastMessage: nextMessage.content,
    });
    return { chat: updated, message: nextMessage };
  },
  addChatEvent: (id, content) => demoStore.addChatMessage(id, { senderId: "system", content, mine: false }),
  aiSettings: () => read(keys.aiSettings, defaults.aiSettings),
  saveAiSettings: (settings) => write(keys.aiSettings, settings),
  integrations: () => read(keys.integrations, defaults.integrations),
  saveIntegrations: (items) => write(keys.integrations, items),
  security: () => read(keys.security, defaults.security),
  saveSecurity: (items) => write(keys.security, items),
  activityLogs: () => read("demo:activity-logs", defaults.activityLogs),
  addActivityLog: (action, user = "Ariana Admin") => {
    const logs = demoStore.activityLogs();
    return write("demo:activity-logs", [{ id: `log-${Date.now()}`, user, action, ipAddress: "127.0.0.1", createdAt: new Date().toISOString() }, ...logs]);
  },
};
