import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock, MessageSquare, Star, Ticket } from "lucide-react";
import { useTranslation } from "react-i18next";
import api from "../../api/axios.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import StatCard from "../../components/common/StatCard.jsx";
import TicketTable from "../../components/tickets/TicketTable.jsx";
import { extractArray, normalizeItems } from "../../utils/helpers.js";

const closedTicketStatuses = ["RESOLVED", "AUTO_CLOSED", "CLOSED"];
const openTicketStatuses = ["OPEN", "ASSIGNED", "IN_PROGRESS", "WAITING_CUSTOMER", "RESOLUTION_PROPOSED", "CUSTOMER_RESPONDED_AFTER_RESOLUTION", "REOPENED"];
const activeChatStatuses = ["ASSIGNED", "ACTIVE", "WAITING", "TRANSFERRED"];

function normalizeStatus(status) {
  return String(status || "").trim().replace(/\s+/g, "_").toUpperCase();
}

function isToday(value) {
  if (!value) return false;
  const date = new Date(value);
  const today = new Date();
  return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
}

function readAgentReport(payload) {
  return normalizeItems(payload, [])[0] || null;
}

function resolveStatNumber(...values) {
  const numbers = values.map((value) => Number(value)).filter((value) => Number.isFinite(value));
  return numbers.find((value) => value !== 0) ?? numbers[0] ?? 0;
}

export default function AgentDashboard() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [chats, setChats] = useState([]);
  const [agentStats, setAgentStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [loadError, setLoadError] = useState("");

  const loadDashboard = useCallback(() => {
    setLoading(true);
    setLoadError("");
    Promise.allSettled([api.get("/tickets"), api.get("/chats"), api.get("/reports/agents")]).then(([ticketsResult, chatsResult, agentResult]) => {
      const nextTickets = ticketsResult.status === "fulfilled" ? extractArray(ticketsResult.value, "tickets") : [];
      const nextChats = chatsResult.status === "fulfilled" ? extractArray(chatsResult.value, "chats") : [];
      const nextAgentStats = agentResult.status === "fulfilled" ? readAgentReport(agentResult.value.data) : null;
      setItems(nextTickets);
      setChats(nextChats);
      setAgentStats(nextAgentStats);
      const failed = [ticketsResult, chatsResult, agentResult].find((result) => result.status === "rejected");
      if (failed) setLoadError(failed.reason?.friendlyMessage || "Unable to load live dashboard data.");
    }).finally(() => {
      setHasLoadedOnce(true);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    loadDashboard();
    const intervalId = window.setInterval(loadDashboard, 15000);
    window.addEventListener("focus", loadDashboard);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", loadDashboard);
    };
  }, [loadDashboard]);

  const reportTickets = !items.length && Array.isArray(agentStats?.assigned) ? agentStats.assigned : [];
  const assignedItems = items.length ? items : reportTickets;
  const assignedTicketCount = resolveStatNumber(agentStats?.assignedTickets, assignedItems.length);
  const pending = assignedItems.filter((ticket) => openTicketStatuses.includes(normalizeStatus(ticket.status))).length;
  const reportResolvedToday = Number(agentStats?.resolvedToday);
  const resolvedToday = Number.isFinite(reportResolvedToday)
    ? reportResolvedToday
    : assignedItems.filter((ticket) => closedTicketStatuses.includes(normalizeStatus(ticket.status)) && isToday(ticket.resolvedAt || ticket.closedAt || ticket.updatedAt)).length;
  const reportActiveChats = Number(agentStats?.activeChats);
  const activeChats = Number.isFinite(reportActiveChats)
    ? reportActiveChats
    : chats.filter((chat) => activeChatStatuses.includes(normalizeStatus(chat.status))).length;
  const avgResponse = Number(agentStats?.avgFirstResponseMinutes) > 0 ? `${agentStats.avgFirstResponseMinutes}m` : "N/A";
  const rating = agentStats?.rating && agentStats.rating !== "N/A" ? `${agentStats.rating}/5` : "N/A";
  return (
    <>
      <PageHeader title={t("dashboard.agent.title")} description={t("dashboard.agent.description")} />
      {loadError ? <p className="mb-4 rounded-md border border-amber-100 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">{loadError}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard title={t("dashboard.stats.assignedTickets")} value={assignedTicketCount} icon={Ticket} tone="sky" />
        <StatCard title={t("dashboard.stats.pendingTickets")} value={pending} icon={Ticket} tone="amber" />
        <StatCard title={t("dashboard.stats.resolvedToday")} value={resolvedToday} icon={CheckCircle2} tone="emerald" />
        <StatCard title={t("dashboard.stats.liveChats")} value={activeChats} icon={MessageSquare} tone="violet" />
        <StatCard title={t("dashboard.stats.avgResponse")} value={avgResponse} icon={Clock} tone="rose" />
        <StatCard title={t("dashboard.stats.rating")} value={rating} icon={Star} tone="rose" />
      </div>
      <div className="mt-6"><TicketTable tickets={assignedItems} basePath="/agent/tickets" /></div>
    </>
  );
}

