import { useEffect, useState } from "react";
import { CheckCircle2, Clock, MessageSquare, Star, Ticket } from "lucide-react";
import { useTranslation } from "react-i18next";
import api from "../../api/axios.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import StatCard from "../../components/common/StatCard.jsx";
import TicketTable from "../../components/tickets/TicketTable.jsx";
import { tickets } from "../../utils/dummyData.js";
import { normalizeItems } from "../../utils/helpers.js";
import { demoStore } from "../../utils/demoStore.js";

export default function AgentDashboard() {
  const { t } = useTranslation();
  const [items, setItems] = useState(tickets);
  const [chats, setChats] = useState([]);

  useEffect(() => {
    api.get("/tickets").then(({ data }) => setItems(normalizeItems(data, tickets))).catch(() => setItems(demoStore.tickets()));
    api.get("/chats").then(({ data }) => setChats(normalizeItems(data, []))).catch(() => setChats(demoStore.chats()));
  }, []);

  const resolved = items.filter((ticket) => ["RESOLVED", "CLOSED"].includes(ticket.status)).length;
  const pending = items.filter((ticket) => ["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER"].includes(ticket.status)).length;
  const activeChats = chats.filter((chat) => ["ACTIVE", "WAITING", "TRANSFERRED"].includes(chat.status)).length;

  return (
    <>
      <PageHeader title={t("dashboard.agent.title")} description={t("dashboard.agent.description")} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard title={t("dashboard.stats.assignedTickets")} value={items.length} icon={Ticket} tone="sky" />
        <StatCard title={t("dashboard.stats.pendingTickets")} value={pending} icon={Ticket} tone="amber" />
        <StatCard title={t("dashboard.stats.resolvedToday")} value={resolved} icon={CheckCircle2} tone="emerald" />
        <StatCard title={t("dashboard.stats.liveChats")} value={activeChats} icon={MessageSquare} tone="violet" />
        <StatCard title={t("dashboard.stats.avgResponse")} value="1m 42s" icon={Clock} tone="rose" />
        <StatCard title={t("dashboard.stats.rating")} value="4.9/5" icon={Star} tone="rose" />
      </div>
      <div className="mt-6"><TicketTable tickets={items} basePath="/agent/tickets" /></div>
    </>
  );
}
