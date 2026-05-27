import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import Button from "../../components/common/Button.jsx";
import Card from "../../components/common/Card.jsx";
import TicketCard from "../../components/tickets/TicketCard.jsx";
import { tickets } from "../../utils/dummyData.js";
import { normalizeItems } from "../../utils/helpers.js";
import { demoStore } from "../../utils/demoStore.js";

export default function CustomerTickets() {
  const [items, setItems] = useState(tickets);
  const [filters, setFilters] = useState({ search: "", status: "" });
  useEffect(() => {
    const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
    api.get(`/tickets?${params.toString()}`).then(({ data }) => setItems(normalizeItems(data, tickets))).catch(() => {
      const search = filters.search.toLowerCase();
      setItems(demoStore.tickets().filter((ticket) => {
        const matchesSearch = !search || `${ticket.subject} ${ticket.description}`.toLowerCase().includes(search);
        const matchesStatus = !filters.status || ticket.status === filters.status;
        return matchesSearch && matchesStatus;
      }));
    });
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
      {items.length ? (
        <div className="grid gap-4 lg:grid-cols-2">{items.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)}</div>
      ) : (
        <Card className="p-8 text-center">
          <h2 className="font-semibold text-slate-950">No tickets found</h2>
          <p className="mt-2 text-sm text-slate-500">Try changing the filters or create a new support request.</p>
          <Link to="/customer/tickets/create"><Button className="mt-4">Create ticket</Button></Link>
        </Card>
      )}
    </>
  );
}
