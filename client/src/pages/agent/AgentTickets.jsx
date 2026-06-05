import { useEffect, useState } from "react";
import api from "../../api/axios.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import Card from "../../components/common/Card.jsx";
import TicketTable from "../../components/tickets/TicketTable.jsx";
import { normalizeItems } from "../../utils/helpers.js";
import { useTranslation } from "react-i18next";

export default function AgentTickets() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({ search: "", status: "" });
  useEffect(() => {
    const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
    api.get(`/tickets?${params.toString()}`).then(({ data }) => setItems(normalizeItems(data, []))).catch(() => setItems([]));
  }, [filters]);
  return (
    <>
      <PageHeader title={t("pages.assignedTickets.title")} description={t("pages.assignedTickets.description")} />
      <Card className="mb-4 p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_180px]">
          <input className="app-field" placeholder={t("ticketsUi.searchTickets")} value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} />
          <select className="app-field" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
            <option value="">{t("ticketsUi.allStatuses")}</option><option>OPEN</option><option>IN_PROGRESS</option><option>WAITING_CUSTOMER</option><option>RESOLVED</option><option>CLOSED</option>
          </select>
        </div>
      </Card>
      {items.length ? (
        <TicketTable tickets={items} basePath="/agent/tickets" />
      ) : (
        <Card className="p-8 text-center">
          <h2 className="font-semibold text-slate-950">{t("empty.noAssignedTickets")}</h2>
          <p className="mt-2 text-sm text-slate-500">{t("empty.noAssignedTicketsHelp")}</p>
        </Card>
      )}
    </>
  );
}
