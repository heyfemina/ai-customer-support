import { useEffect, useState } from "react";
import PageHeader from "../../components/common/PageHeader.jsx";
import Button from "../../components/common/Button.jsx";
import TicketTable from "../../components/tickets/TicketTable.jsx";
import api from "../../api/axios.js";
import { normalizeItems } from "../../utils/helpers.js";
import { useTranslation } from "react-i18next";

export default function Tickets() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({ search: "", status: "", priority: "", agentId: "", customerId: "" });
  const [agents, setAgents] = useState([]);
  const [customers, setCustomers] = useState([]);

  useEffect(() => {
    const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
    api.get(`/tickets?${params.toString()}`).then(({ data }) => setItems(normalizeItems(data, []))).catch(() => setItems([]));
  }, [filters]);

  useEffect(() => {
    api.get("/reports/agents").then(({ data }) => setAgents(normalizeItems(data, []))).catch(() => setAgents([]));
    api.get("/reports/customers").then(({ data }) => setCustomers(normalizeItems(data, []))).catch(() => setCustomers([]));
  }, []);

  return (
    <>
      <PageHeader title="Ticket management" description="Review, assign, prioritize, reply, and resolve support tickets." actions={<Button>Export report</Button>} />
      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_170px_170px_170px_170px]">
        <input className="h-11 rounded-md border border-slate-200 px-3 text-sm" placeholder={t("ticketsUi.searchTickets")} value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} />
        <select className="h-11 rounded-md border border-slate-200 px-3 text-sm" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
          <option value="">{t("ticketsUi.allStatuses")}</option><option>OPEN</option><option>IN_PROGRESS</option><option>WAITING_CUSTOMER</option><option>RESOLVED</option><option>CLOSED</option>
        </select>
        <select className="h-11 rounded-md border border-slate-200 px-3 text-sm" value={filters.priority} onChange={(event) => setFilters({ ...filters, priority: event.target.value })}>
          <option value="">{t("ticketsUi.allPriorities")}</option><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>URGENT</option>
        </select>
        <select className="h-11 rounded-md border border-slate-200 px-3 text-sm" value={filters.agentId} onChange={(event) => setFilters({ ...filters, agentId: event.target.value })}>
          <option value="">{t("ticketsUi.filterByAgent")}</option>{agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
        </select>
        <select className="h-11 rounded-md border border-slate-200 px-3 text-sm" value={filters.customerId} onChange={(event) => setFilters({ ...filters, customerId: event.target.value })}>
          <option value="">{t("ticketsUi.filterByCustomer")}</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
        </select>
      </div>
      <TicketTable tickets={items} />
    </>
  );
}
