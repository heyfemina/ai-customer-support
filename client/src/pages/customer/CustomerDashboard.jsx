import { useEffect, useState } from "react";
import { MessageSquare, PlusCircle, Ticket, Timer } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../../api/axios.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import Button from "../../components/common/Button.jsx";
import StatCard from "../../components/common/StatCard.jsx";
import TicketCard from "../../components/tickets/TicketCard.jsx";
import { tickets } from "../../utils/dummyData.js";
import { normalizeItems } from "../../utils/helpers.js";

export default function CustomerDashboard() {
  const [items, setItems] = useState(tickets);
  const [chats, setChats] = useState([]);
  useEffect(() => {
    api.get("/tickets").then(({ data }) => setItems(normalizeItems(data, tickets))).catch(() => setItems(tickets));
    api.get("/chats").then(({ data }) => setChats(normalizeItems(data, []))).catch(() => setChats([]));
  }, []);
  const activeChats = chats.filter((chat) => ["ACTIVE", "WAITING", "TRANSFERRED"].includes(chat.status)).length;

  return (
    <>
      <PageHeader title="Customer dashboard" description="Track requests, continue live chats, review history, and rate support." actions={<Link to="/customer/tickets/create"><Button icon={PlusCircle}>Create ticket</Button></Link>} />
      <div className="grid gap-4 md:grid-cols-3"><StatCard title="My tickets" value={items.length} icon={Ticket} /><StatCard title="Active chats" value={activeChats} icon={MessageSquare} tone="violet" /><StatCard title="Avg response" value="3m 05s" icon={Timer} tone="amber" /></div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">{items.slice(0, 2).map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)}</div>
    </>
  );
}
