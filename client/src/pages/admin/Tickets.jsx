import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader.jsx";
import Button from "../../components/common/Button.jsx";
import Card from "../../components/common/Card.jsx";
import Pagination from "../../components/common/Pagination.jsx";
import TicketTable from "../../components/tickets/TicketTable.jsx";
import api from "../../api/axios.js";
import { extractArray, normalizeItems, unwrapData } from "../../utils/helpers.js";
import { useTranslation } from "react-i18next";
import { downloadReport } from "../../utils/downloadReport.js";

export default function Tickets() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({ search: "", status: "", priority: "", agentId: "", customerId: "", dateFrom: "", dateTo: "" });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [agents, setAgents] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const query = searchParams.get("search") || "";
    setFilters((current) => current.search === query ? current : { ...current, search: query });
    setPage(1);
  }, [searchParams]);

  useEffect(() => {
    const params = Object.fromEntries(Object.entries({ ...filters, page, limit }).filter(([, value]) => value));
    setLoading(true);
    setError("");
    api.get("/tickets", { params }).then((response) => {
      const payload = unwrapData(response.data, {});
      const rows = extractArray(response, "tickets");
      setItems(rows);
      setPagination(payload.pagination || { page, limit, total: payload.items?.length || 0, totalPages: 1 });
    }).catch((error) => {
      setError(error.friendlyMessage || "Unable to load live ticket data.");
      setItems([]);
      setPagination({ page: 1, limit, total: 0, totalPages: 1 });
    }).finally(() => setLoading(false));
  }, [filters, page, limit]);

  const updateFilter = (patch) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  };

  useEffect(() => {
    api.get("/reports/agents").then(({ data }) => setAgents(normalizeItems(data, []))).catch((error) => setError(error.friendlyMessage || "Unable to load agent filters."));
    api.get("/reports/customers").then(({ data }) => setCustomers(normalizeItems(data, []))).catch((error) => setError(error.friendlyMessage || "Unable to load customer filters."));
  }, []);

  return (
    <>
      <PageHeader title={t("pages.ticketManagement.title")} description={t("pages.ticketManagement.description")} actions={<Button onClick={() => downloadReport("/reports/export/tickets?format=csv", "tickets-report.csv")}>{t("common.exportReport")}</Button>} />
      {error ? <p className="mb-4 rounded-md border border-amber-100 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">{error}</p> : null}
      <Card className="mb-4 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-950">{t("common.filters")}</p>
            <p className="text-xs text-slate-500">{t("ticketsUi.filterHelp", { defaultValue: "Refine ticket results without losing your current workflow." })}</p>
          </div>
          <Button size="sm" variant="ghost" onClick={() => updateFilter({ search: "", status: "", priority: "", agentId: "", customerId: "", dateFrom: "", dateTo: "" })}>{t("common.clear")}</Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_150px_150px_170px_170px_150px_150px]">
          <input className="app-field" placeholder={t("ticketsUi.searchDetailed", { defaultValue: "Search ticket ID, customer email, agent, subject" })} value={filters.search} onChange={(event) => updateFilter({ search: event.target.value })} />
          <select className="app-field" value={filters.status} onChange={(event) => updateFilter({ status: event.target.value })}>
            <option value="">{t("ticketsUi.allStatuses")}</option><option>OPEN</option><option>ASSIGNED</option><option>IN_PROGRESS</option><option>WAITING_CUSTOMER</option><option>RESOLUTION_PROPOSED</option><option>CUSTOMER_RESPONDED_AFTER_RESOLUTION</option><option>REOPENED</option><option>AUTO_CLOSED</option><option>CLOSED</option>
          </select>
          <select className="app-field" value={filters.priority} onChange={(event) => updateFilter({ priority: event.target.value })}>
            <option value="">{t("ticketsUi.allPriorities")}</option><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>URGENT</option>
          </select>
          <select className="app-field" value={filters.agentId} onChange={(event) => updateFilter({ agentId: event.target.value })}>
            <option value="">{t("ticketsUi.filterByAgent")}</option>{agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
          </select>
          <select className="app-field" value={filters.customerId} onChange={(event) => updateFilter({ customerId: event.target.value })}>
            <option value="">{t("ticketsUi.filterByCustomer")}</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
          </select>
          <input type="date" className="app-field" value={filters.dateFrom} onChange={(event) => updateFilter({ dateFrom: event.target.value })} />
          <input type="date" className="app-field" value={filters.dateTo} onChange={(event) => updateFilter({ dateTo: event.target.value })} />
        </div>
      </Card>
      <TicketTable tickets={items} paginated={false} />
      <Pagination page={pagination.page} pageSize={limit} total={pagination.total} itemLabel="tickets" onPageChange={setPage} onPageSizeChange={(value) => { setLimit(value); setPage(1); }} />
    </>
  );
}
