import { useEffect, useState } from "react";
import api from "../../api/axios.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import TicketTable from "../../components/tickets/TicketTable.jsx";
import { tickets } from "../../utils/dummyData.js";
import { normalizeItems } from "../../utils/helpers.js";

export default function AgentTickets() {
  const [items, setItems] = useState(tickets);
  const [filters, setFilters] = useState({ search: "", status: "" });
  useEffect(() => {
    const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
    api.get(`/tickets?${params.toString()}`).then(({ data }) => setItems(normalizeItems(data, tickets))).catch(() => setItems(tickets));
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
      <TicketTable tickets={items} basePath="/agent/tickets" />
    </>
  );
}
