import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock, MessageSquare, Star, Ticket } from "lucide-react";
import { useTranslation } from "react-i18next";
import api from "../../api/axios.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import StatCard from "../../components/common/StatCard.jsx";
import TicketTable from "../../components/tickets/TicketTable.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { normalizeItems } from "../../utils/helpers.js";

export default function AgentDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
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
      if (ticketsResult.status === "fulfilled") setItems(normalizeItems(ticketsResult.value.data, []));
      if (chatsResult.status === "fulfilled") setChats(normalizeItems(chatsResult.value.data, []));
      if (agentResult.status === "fulfilled") setAgentStats(normalizeItems(agentResult.value.data, [])[0] || null);
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

  const assignedItems = items.filter((ticket) => ticket.agentId === user?.id || ticket.agent?.id === user?.id);
  const ownChats = chats.filter((chat) => chat.agentId === user?.id || chat.agent?.id === user?.id);
  const resolved = assignedItems.filter((ticket) => ["RESOLVED", "AUTO_CLOSED", "CLOSED"].includes(ticket.status)).length;
  const pending = assignedItems.filter((ticket) => ["OPEN", "ASSIGNED", "IN_PROGRESS", "WAITING_CUSTOMER", "RESOLUTION_PROPOSED", "CUSTOMER_RESPONDED_AFTER_RESOLUTION", "REOPENED"].includes(ticket.status)).length;
  const activeChats = ownChats.filter((chat) => ["ASSIGNED", "ACTIVE", "WAITING", "TRANSFERRED"].includes(chat.status)).length;
  const avgResponse = agentStats?.avgFirstResponseMinutes ? `${agentStats.avgFirstResponseMinutes}m` : "N/A";
  const rating = agentStats?.rating && agentStats.rating !== "N/A" ? `${agentStats.rating}/5` : "N/A";
  return (
    <>
      <PageHeader title={t("dashboard.agent.title")} description={t("dashboard.agent.description")} />
      {loadError ? <p className="mb-4 rounded-md border border-amber-100 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">{loadError}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard title={t("dashboard.stats.assignedTickets")} value={assignedItems.length} icon={Ticket} tone="sky" />
        <StatCard title={t("dashboard.stats.pendingTickets")} value={pending} icon={Ticket} tone="amber" />
        <StatCard title={t("dashboard.stats.resolvedToday")} value={resolved} icon={CheckCircle2} tone="emerald" />
        <StatCard title={t("dashboard.stats.liveChats")} value={activeChats} icon={MessageSquare} tone="violet" />
        <StatCard title={t("dashboard.stats.avgResponse")} value={avgResponse} icon={Clock} tone="rose" />
        <StatCard title={t("dashboard.stats.rating")} value={rating} icon={Star} tone="rose" />
      </div>
      <div className="mt-6"><TicketTable tickets={assignedItems} basePath="/agent/tickets" /></div>
    </>
  );
}

