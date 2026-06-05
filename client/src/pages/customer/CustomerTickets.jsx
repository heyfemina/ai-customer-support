import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import Button from "../../components/common/Button.jsx";
import Card from "../../components/common/Card.jsx";
import Pagination from "../../components/common/Pagination.jsx";
import TicketCard from "../../components/tickets/TicketCard.jsx";
import { normalizeItems } from "../../utils/helpers.js";
import { useTranslation } from "react-i18next";

export default function CustomerTickets() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({ search: "", status: "" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  useEffect(() => {
    const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
    api.get(`/tickets?${params.toString()}`).then(({ data }) => setItems(normalizeItems(data, []))).catch(() => setItems([]));
  }, [filters]);
  const pagedItems = items.slice((page - 1) * pageSize, page * pageSize);
  const updateFilters = (patch) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  };
  return (
    <>
      <PageHeader title={t("pages.myTickets.title")} description={t("pages.myTickets.description")} actions={<Link to="/customer/tickets/create"><Button>{t("buttons.createTicket")}</Button></Link>} />
      <Card className="mb-4 p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_180px]">
          <input className="app-field" placeholder={t("ticketsUi.searchTickets")} value={filters.search} onChange={(event) => updateFilters({ search: event.target.value })} />
          <select className="app-field" value={filters.status} onChange={(event) => updateFilters({ status: event.target.value })}>
            <option value="">{t("ticketsUi.allStatuses")}</option><option>OPEN</option><option>IN_PROGRESS</option><option>WAITING_CUSTOMER</option><option>RESOLVED</option><option>CLOSED</option>
          </select>
        </div>
      </Card>
      {items.length ? (
        <>
          <div className="grid gap-4 lg:grid-cols-2">{pagedItems.map((ticket) => <TicketCard key={ticket.id} ticket={ticket} />)}</div>
          <Pagination page={page} pageSize={pageSize} total={items.length} itemLabel="tickets" onPageChange={setPage} onPageSizeChange={(value) => { setPageSize(value); setPage(1); }} />
        </>
      ) : (
        <Card className="p-8 text-center">
          <h2 className="font-semibold text-slate-950">{t("empty.noTickets")}</h2>
          <p className="mt-2 text-sm text-slate-500">{t("empty.noTicketsHelp")}</p>
          <Link to="/customer/tickets/create"><Button className="mt-4">{t("buttons.createTicket")}</Button></Link>
        </Card>
      )}
    </>
  );
}
