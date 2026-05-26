import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import Button from "../../components/common/Button.jsx";
import TicketCard from "../../components/tickets/TicketCard.jsx";
import { tickets } from "../../utils/dummyData.js";
import { normalizeItems } from "../../utils/helpers.js";

export default function CustomerTickets() {
  const [items, setItems] = useState(tickets);
  const [filters, setFilters] = useState({ search: "", status: "" });
  useEffect(() => {
    const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
    api.get(`/tickets?${params.toString()}`).then(({ data }) => setItems(normalizeItems(data, tickets))).catch(() => setItems(tickets));
  }, [filters]);
  return (
    <>
      <PageHeader title="My tickets" description="Track support requests, status, replies, and attachments." actions={<Link to="/customer/tickets/create"><Button>Create ticket</Button></Link>} />
      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_180px]">
        <input className="h-11 rounded-md border border-slate-200 px-3 text-sm" placeholder="Search tickets" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} />
        <select className="h-11 rounded-md border border-slate-200 px-3 text-sm" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
          <option value="">All statuses</option><option>OPEN</option><option>IN_PROGRESS</option><option>WAITING_CUSTOMER</option><option>RESOLVED</option><option>CLOSED</option>
        </select>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">{items.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)}</div>
    </>
  );
}
