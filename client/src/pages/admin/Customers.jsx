import { useEffect, useState } from "react";
import api from "../../api/axios.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import Table from "../../components/common/Table.jsx";
import Badge from "../../components/common/Badge.jsx";
import Card from "../../components/common/Card.jsx";
import Pagination from "../../components/common/Pagination.jsx";
import { normalizeItems } from "../../utils/helpers.js";
import { useTranslation } from "react-i18next";

export default function Customers() {
  const { t } = useTranslation();
  const [customers, setCustomers] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  useEffect(() => {
    api.get("/reports/customers").then(({ data }) => setCustomers(normalizeItems(data, []))).catch(() => setCustomers([]));
  }, []);
  const pagedCustomers = customers.slice((page - 1) * pageSize, page * pageSize);
  const columns = [
    { key: "name", labelKey: "table.customer" },
    { key: "email", labelKey: "table.email" },
    { key: "tickets", labelKey: "nav.tickets", align: "center", render: (row) => row.ticketCount ?? row.tickets?.length ?? 0 },
    { key: "feedbackCount", labelKey: "table.feedback", align: "center", render: (row) => row.feedbackCount ?? 0 },
    { key: "complaintCount", labelKey: "table.complaints", align: "center", render: (row) => row.complaintCount ?? 0 },
    { key: "activeChats", labelKey: "table.activeChats", align: "center", render: (row) => row.activeChats ?? 0 },
    { key: "plan", labelKey: "table.plan", align: "center", render: () => <Badge tone="blue">{t("common.business")}</Badge> },
  ];
  return (
    <>
      <PageHeader title={t("pages.customers.title")} description={t("pages.customers.description")} />
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <Card className="p-4"><p className="text-sm font-semibold text-slate-500">{t("common.totalCustomers")}</p><p className="mt-2 text-2xl font-bold text-slate-950">{customers.length}</p></Card>
        <Card className="p-4"><p className="text-sm font-semibold text-slate-500">{t("common.supportTickets")}</p><p className="mt-2 text-2xl font-bold text-slate-950">{customers.reduce((total, customer) => total + Number(customer.ticketCount || customer.tickets?.length || 0), 0)}</p></Card>
        <Card className="p-4"><p className="text-sm font-semibold text-slate-500">{t("table.activeChats")}</p><p className="mt-2 text-2xl font-bold text-slate-950">{customers.reduce((total, customer) => total + Number(customer.activeChats || 0), 0)}</p></Card>
      </div>
      <Table columns={columns} data={pagedCustomers} paginated={false} />
      <Pagination page={page} pageSize={pageSize} total={customers.length} itemLabel="customers" onPageChange={setPage} onPageSizeChange={(value) => { setPageSize(value); setPage(1); }} />
    </>
  );
}
