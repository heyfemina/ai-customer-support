import { useEffect, useState } from "react";
import { MessageSquare, PlusCircle, Ticket, Timer } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../../api/axios.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import Button from "../../components/common/Button.jsx";
import StatCard from "../../components/common/StatCard.jsx";
import TicketCard from "../../components/tickets/TicketCard.jsx";
import { normalizeItems } from "../../utils/helpers.js";

export default function CustomerDashboard() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [chats, setChats] = useState([]);
  useEffect(() => {
    api.get("/tickets").then(({ data }) => setItems(normalizeItems(data, []))).catch(() => setItems([]));
    api.get("/chats").then(({ data }) => setChats(normalizeItems(data, []))).catch(() => setChats([]));
  }, []);
  const activeChats = chats.filter((chat) => ["ASSIGNED", "ACTIVE", "WAITING", "TRANSFERRED"].includes(chat.status)).length;
  const openTickets = items.filter((ticket) => !["RESOLVED", "CLOSED"].includes(ticket.status)).length;

  return (
    <>
      <PageHeader title={t("dashboard.customer.title")} description={t("dashboard.customer.description")} actions={<div className="flex flex-wrap gap-2"><Link to="/customer/live-chat"><Button variant="secondary" icon={MessageSquare}>{t("dashboard.customer.openLiveChat")}</Button></Link><Link to="/customer/tickets/create"><Button icon={PlusCircle}>{t("buttons.createTicket")}</Button></Link></div>} />
      <div className="grid gap-4 md:grid-cols-4"><StatCard title={t("dashboard.stats.myTickets")} value={items.length} icon={Ticket} /><StatCard title={t("dashboard.stats.openTickets")} value={openTickets} icon={Ticket} tone="amber" /><StatCard title={t("dashboard.stats.activeChats")} value={activeChats} icon={MessageSquare} tone="violet" /><StatCard title={t("dashboard.stats.avgResponse")} value="N/A" icon={Timer} tone="rose" /></div>
      <div className="mt-6 flex items-center justify-between gap-3">
        <h2 className="font-semibold text-slate-950">{t("dashboard.customer.recentSupportRequests")}</h2>
        <Link to="/customer/tickets" className="text-sm font-semibold text-blue-700">{t("dashboard.customer.viewAllTickets")}</Link>
      </div>
      <div className="mt-3 grid gap-4 lg:grid-cols-2">{items.slice(0, 4).map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)}</div>
    </>
  );
}
