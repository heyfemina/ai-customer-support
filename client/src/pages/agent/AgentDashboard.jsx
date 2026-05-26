import { useEffect, useState } from "react";
import { CheckCircle2, Clock, MessageSquare, Star, Ticket } from "lucide-react";
import api from "../../api/axios.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import StatCard from "../../components/common/StatCard.jsx";
import TicketTable from "../../components/tickets/TicketTable.jsx";
import { tickets } from "../../utils/dummyData.js";
import { normalizeItems } from "../../utils/helpers.js";

export default function AgentDashboard() {
  const [items, setItems] = useState(tickets);
  const [chats, setChats] = useState([]);

  useEffect(() => {
    api.get("/tickets").then(({ data }) => setItems(normalizeItems(data, tickets))).catch(() => setItems(tickets));
    api.get("/chats").then(({ data }) => setChats(normalizeItems(data, []))).catch(() => setChats([]));
  }, []);

  const resolved = items.filter((ticket) => ["RESOLVED", "CLOSED"].includes(ticket.status)).length;
  const activeChats = chats.filter((chat) => ["ACTIVE", "WAITING", "TRANSFERRED"].includes(chat.status)).length;

  return (
    <>
      <PageHeader title="Agent dashboard" description="Assigned workload, live chats, response time, and customer feedback." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Assigned tickets" value={items.length} icon={Ticket} tone="sky" />
        <StatCard title="Resolved today" value={resolved} icon={CheckCircle2} tone="emerald" />
        <StatCard title="Live chats" value={activeChats} icon={MessageSquare} tone="violet" />
        <StatCard title="Avg response" value="1m 42s" icon={Clock} tone="amber" />
        <StatCard title="Rating" value="4.9/5" icon={Star} tone="rose" />
      </div>
      <div className="mt-6"><TicketTable tickets={items} basePath="/agent/tickets" /></div>
    </>
  );
}
