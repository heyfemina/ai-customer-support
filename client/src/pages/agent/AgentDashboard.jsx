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
      <section className="mb-6 rounded-lg border border-white/70 bg-white/95 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.07)] ring-1 ring-slate-900/[0.03]">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <p className="text-sm font-semibold text-sky-700">{t("nav.performance")}</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">{t("dashboard.agent.title")}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{t("dashboard.agent.description")}</p>
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm">
              <p className="text-2xl font-bold text-slate-950">{pending}</p>
              <p className="text-xs font-semibold text-slate-500">{t("dashboard.stats.pendingTickets")}</p>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm">
              <p className="text-2xl font-bold text-slate-950">{resolved}</p>
              <p className="text-xs font-semibold text-slate-500">{t("dashboard.stats.resolvedToday")}</p>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm">
              <p className="text-2xl font-bold text-slate-950">{activeChats}</p>
              <p className="text-xs font-semibold text-slate-500">{t("dashboard.stats.liveChats")}</p>
            </div>
          </div>
        </div>
      </section>
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
