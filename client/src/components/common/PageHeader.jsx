import { useTranslation } from "react-i18next";

const titleKeys = {
  "Activity logs": "pages.activityLogs.title",
  "Agent management": "pages.agents.title",
  "AI configuration settings": "pages.aiSettings.title",
  "Assigned tickets": "pages.assignedTickets.title",
  "Chat monitoring": "pages.chatMonitoring.title",
  "Create ticket": "pages.createTicket.title",
  "Customer management": "pages.customers.title",
  "Integration settings": "pages.integrations.title",
  "Live chat queue": "pages.liveChatQueue.title",
  "My tickets": "pages.myTickets.title",
  "Profile": "pages.profile.title",
  "Security settings": "pages.security.title",
  "Ticket management": "pages.ticketManagement.title",
  "User management": "pages.users.title",
};

const descriptionKeys = {
  "Accept live chats, transfer conversations, view history, and send secure messages.": "pages.liveChatQueue.description",
  "Assign agents, change status, review timeline, and reply to the customer.": "pages.ticketDetails.adminDescription",
  "Audit user actions, security events, and operational changes.": "pages.activityLogs.description",
  "Authentication, compliance, API security, audit controls, and resilience placeholders.": "pages.security.description",
  "Configure WhatsApp, website chatbot, and email support channels.": "pages.integrations.description",
  "Create, edit, deactivate, and audit platform users.": "pages.users.description",
  "Handle support tickets, reply to customers, and manage ticket status.": "pages.assignedTickets.description",
  "Manage customer details, language, security preferences, and data privacy requests.": "pages.profile.description",
  "Monitor assignments, availability, workload, and ratings.": "pages.agents.description",
  "Monitor live conversations, AI-to-agent handoffs, queues, notifications, and visitor sessions.": "pages.chatMonitoring.description",
  "Review, assign, prioritize, reply, and resolve support tickets.": "pages.ticketManagement.description",
  "Start a secure AI-assisted support chat, share files, and rate the experience.": "pages.customerLiveChat.description",
  "Submit a support request with priority, category, and optional files or images.": "pages.createTicket.description",
  "Ticket details, customer profile, reply timeline, attachments, and status controls.": "pages.ticketDetails.agentDescription",
  "Ticket tracking, details, chat history, feedback, and support replies.": "pages.ticketDetails.customerDescription",
  "Track support requests, status, replies, and attachments.": "pages.myTickets.description",
  "Tune bot identity, fallback behavior, translation, summarization, and human transfer rules.": "pages.aiSettings.description",
  "View customer profiles, support history, and account health.": "pages.customers.description",
};

export default function PageHeader({ title, description, actions }) {
  const { t } = useTranslation();
  const translatedTitle = titleKeys[title] ? t(titleKeys[title]) : title;
  const translatedDescription = descriptionKeys[description] ? t(descriptionKeys[description]) : description;

  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">{translatedTitle}</h1>
        {translatedDescription ? <p className="mt-1 text-sm text-slate-500">{translatedDescription}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );
}
