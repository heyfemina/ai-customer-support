import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSearchParams } from "react-router-dom";
import api from "../../api/axios.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import Button from "../../components/common/Button.jsx";
import Card from "../../components/common/Card.jsx";
import Pagination from "../../components/common/Pagination.jsx";
import TicketCard from "../../components/tickets/TicketCard.jsx";
import { extractArray } from "../../utils/helpers.js";
import { useTranslation } from "react-i18next";

export default function CustomerTickets() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({ search: "", status: "" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    const query = searchParams.get("search") || "";
    setFilters((current) => current.search === query ? current : { ...current, search: query });
    setPage(1);
  }, [searchParams]);
  useEffect(() => {
    const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
    setLoading(true);
    setError("");
    api.get("/tickets", { params }).then((response) => setItems(extractArray(response, "tickets"))).catch((error) => {
      setError(error.friendlyMessage || "Unable to load live ticket data.");
      setItems([]);
    }).finally(() => setLoading(false));
  }, [filters]);
  const pagedItems = items.slice((page - 1) * pageSize, page * pageSize);
  const updateFilters = (patch) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  };
  return (
    <>
      <PageHeader title={t("pages.myTickets.title")} description={t("pages.myTickets.description")} actions={<Link to="/customer/tickets/create"><Button>{t("buttons.createTicket")}</Button></Link>} />
      {error ? <p className="mb-4 rounded-md border border-amber-100 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">{error}</p> : null}
      <Card className="mb-4 p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_180px]">
          <input className="app-field" placeholder={t("ticketsUi.searchTickets")} value={filters.search} onChange={(event) => updateFilters({ search: event.target.value })} />
          <select className="app-field" value={filters.status} onChange={(event) => updateFilters({ status: event.target.value })}>
            <option value="">{t("ticketsUi.allStatuses")}</option><option value="OPEN">Open</option><option value="ASSIGNED">Assigned</option><option value="IN_PROGRESS">In Progress</option><option value="WAITING_CUSTOMER">Waiting for Your Reply</option><option value="RESOLUTION_PROPOSED">Solution Provided</option><option value="CUSTOMER_RESPONDED_AFTER_RESOLUTION">Under Review</option><option value="REOPENED">Reopened</option><option value="AUTO_CLOSED">Closed</option><option value="CLOSED">Closed</option>
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
