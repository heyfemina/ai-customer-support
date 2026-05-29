import { useEffect, useState } from "react";
import api from "../../api/axios.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import Card from "../../components/common/Card.jsx";
import TicketTable from "../../components/tickets/TicketTable.jsx";
import { normalizeItems } from "../../utils/helpers.js";

export default function AgentTickets() {
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({ search: "", status: "" });
  useEffect(() => {
    const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
    api.get(`/tickets?${params.toString()}`).then(({ data }) => setItems(normalizeItems(data, []))).catch(() => setItems([]));
  }, [filters]);
  return (
    <>
      <PageHeader title="Assigned tickets" description="Handle support tickets, reply to customers, and manage ticket status." />
      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_180px]">
        <input className="h-11 rounded-md border border-slate-200 px-3 text-sm" placeholder="Search assigned tickets" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} />
        <select className="h-11 rounded-md border border-slate-200 px-3 text-sm" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
          <option value="">All statuses</option><option>OPEN</option><option>IN_PROGRESS</option><option>WAITING_CUSTOMER</option><option>RESOLVED</option><option>CLOSED</option>
        </select>
      </div>
      {items.length ? (
        <TicketTable tickets={items} basePath="/agent/tickets" />
      ) : (
        <Card className="p-8 text-center">
          <h2 className="font-semibold text-slate-950">No assigned tickets found</h2>
          <p className="mt-2 text-sm text-slate-500">Try another status or search term.</p>
        </Card>
      )}
    </>
  );
}
