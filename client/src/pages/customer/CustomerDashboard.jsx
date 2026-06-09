import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, MessageSquare, PlusCircle, Ticket, Timer } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../../api/axios.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import Button from "../../components/common/Button.jsx";
import Card from "../../components/common/Card.jsx";
import Badge from "../../components/common/Badge.jsx";
import StatCard from "../../components/common/StatCard.jsx";
import TicketCard from "../../components/tickets/TicketCard.jsx";
import { formatDate, normalizeItems, sortByRecent } from "../../utils/helpers.js";

export default function CustomerDashboard() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const getWithTimeout = useCallback(async (path) => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 12000);
    try {
      return await api.get(path, { signal: controller.signal });
    } finally {
      window.clearTimeout(timer);
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    try {
      setError("");
      const [ticketResult, chatResult] = await Promise.allSettled([
        getWithTimeout("/tickets"),
        getWithTimeout("/chats"),
      ]);
      if (ticketResult.status === "fulfilled") {
        setItems(sortByRecent(normalizeItems(ticketResult.value.data, []).filter(Boolean)));
      }
      if (chatResult.status === "fulfilled") {
        setChats(sortByRecent(normalizeItems(chatResult.value.data, []).filter(Boolean)));
      }
      if (ticketResult.status === "rejected" || chatResult.status === "rejected") {
        setError("Some live dashboard data could not refresh. Showing the latest loaded values.");
      }
      setLastUpdated(new Date());
    } catch (requestError) {
      setError(requestError.friendlyMessage || "Unable to load your live dashboard data.");
    } finally {
      setHasLoadedOnce(true);
      setLoading(false);
    }
  }, [getWithTimeout]);

  useEffect(() => {
    loadDashboard();
    const intervalId = window.setInterval(loadDashboard, 15000);
    window.addEventListener("focus", loadDashboard);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", loadDashboard);
    };
  }, [loadDashboard]);

  const activeChats = chats.filter((chat) => ["ASSIGNED", "ACTIVE", "WAITING", "TRANSFERRED"].includes(chat?.status)).length;
  const openTickets = items.filter((ticket) => !["RESOLVED", "AUTO_CLOSED", "CLOSED"].includes(ticket?.status)).length;
  const resolvedTickets = items.filter((ticket) => ["RESOLVED", "AUTO_CLOSED", "CLOSED"].includes(ticket?.status)).length;
  const respondedTickets = items.filter((ticket) => ticket?.firstResponseMinutes !== null && ticket?.firstResponseMinutes !== undefined);
  const avgResponse = respondedTickets.length
    ? `${Math.round(respondedTickets.reduce((sum, ticket) => sum + Number(ticket.firstResponseMinutes || 0), 0) / respondedTickets.length)}m`
    : "N/A";
  const recentChats = chats.slice(0, 4);

  return (
    <>
      <PageHeader title={t("dashboard.customer.title")} description={t("dashboard.customer.description")} actions={<div className="flex flex-wrap gap-2"><Link to="/customer/live-chat"><Button variant="secondary" icon={MessageSquare}>{t("dashboard.customer.openLiveChat")}</Button></Link><Link to="/customer/tickets/create"><Button icon={PlusCircle}>{t("buttons.createTicket")}</Button></Link></div>} />
      {error ? <p className="mb-4 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-500">
        <span>{`Loaded ${items.length} tickets and ${chats.length} chats`}</span>
        {lastUpdated ? <span>Last updated {formatDate(lastUpdated)}</span> : null}
      </div>
      <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 xl:grid-cols-5"><StatCard title={t("dashboard.stats.myTickets")} value={items.length} icon={Ticket} /><StatCard title={t("dashboard.stats.openTickets")} value={openTickets} icon={Ticket} tone="amber" /><StatCard title="Resolved tickets" value={resolvedTickets} icon={CheckCircle2} tone="green" /><StatCard title={t("dashboard.stats.activeChats")} value={activeChats} icon={MessageSquare} tone="violet" /><StatCard title={t("dashboard.stats.avgResponse")} value={avgResponse} icon={Timer} tone="rose" /></div>
      <div className="mt-6 flex items-center justify-between gap-3">
        <h2 className="font-semibold text-slate-950">{t("dashboard.customer.recentSupportRequests")}</h2>
        <Link to="/customer/tickets" className="text-sm font-semibold text-blue-700">{t("dashboard.customer.viewAllTickets")}</Link>
      </div>
      {items.length ? (
        <div className="mt-3 grid gap-4 lg:grid-cols-2">{items.slice(0, 4).map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)}</div>
      ) : (
        <Card className="mt-3 p-6 text-center">
          <h2 className="font-semibold text-slate-950">No support tickets yet</h2>
          <p className="mt-2 text-sm text-slate-500">Create a ticket when you need help and it will show here immediately.</p>
          <Link to="/customer/tickets/create"><Button className="mt-4" icon={PlusCircle}>{t("buttons.createTicket")}</Button></Link>
        </Card>
      )}
      <div className="mt-6 flex items-center justify-between gap-3">
        <h2 className="font-semibold text-slate-950">Recent live chats</h2>
        <Link to="/customer/live-chat" className="text-sm font-semibold text-blue-700">{t("dashboard.customer.openLiveChat")}</Link>
      </div>
      {recentChats.length ? (
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          {recentChats.map((chat) => (
            <Card key={chat.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-950">{chat.channel || "Support chat"}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">{chat.lastMessage || "No messages yet"}</p>
                </div>
                <Badge tone={["ASSIGNED", "ACTIVE"].includes(chat.status) ? "green" : chat.status === "WAITING" ? "amber" : "slate"}>{chat.status === "ASSIGNED" ? "Connected" : chat.status}</Badge>
              </div>
              <p className="mt-4 text-xs font-semibold text-slate-500">{formatDate(chat.updatedAt || chat.createdAt)}</p>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="mt-3 p-6 text-center text-sm text-slate-500">No live chat history yet.</Card>
      )}
    </>
  );
}
