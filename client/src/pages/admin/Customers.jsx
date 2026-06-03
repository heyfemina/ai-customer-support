import { useEffect, useState } from "react";
import api from "../../api/axios.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import Table from "../../components/common/Table.jsx";
import Badge from "../../components/common/Badge.jsx";
import Card from "../../components/common/Card.jsx";
import Pagination from "../../components/common/Pagination.jsx";
import { normalizeItems } from "../../utils/helpers.js";

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  useEffect(() => {
    api.get("/reports/customers").then(({ data }) => setCustomers(normalizeItems(data, []))).catch(() => setCustomers([]));
  }, []);
  const pagedCustomers = customers.slice((page - 1) * pageSize, page * pageSize);
  const columns = [
    { key: "name", label: "Customer" },
    { key: "email", label: "Email" },
    { key: "tickets", label: "Tickets", render: (row) => row.ticketCount ?? row.tickets?.length ?? 0 },
    { key: "feedbackCount", label: "Feedback", render: (row) => row.feedbackCount ?? 0 },
    { key: "complaintCount", label: "Complaints", render: (row) => row.complaintCount ?? 0 },
    { key: "activeChats", label: "Active chats", render: (row) => row.activeChats ?? 0 },
    { key: "plan", label: "Plan", render: () => <Badge tone="blue">Business</Badge> },
  ];
  return (
    <>
      <PageHeader title="Customer management" description="View customer profiles, support history, and account health." />
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <Card className="p-4"><p className="text-sm font-semibold text-slate-500">Total customers</p><p className="mt-2 text-2xl font-bold text-slate-950">{customers.length}</p></Card>
        <Card className="p-4"><p className="text-sm font-semibold text-slate-500">Support tickets</p><p className="mt-2 text-2xl font-bold text-slate-950">{customers.reduce((total, customer) => total + Number(customer.ticketCount || customer.tickets?.length || 0), 0)}</p></Card>
        <Card className="p-4"><p className="text-sm font-semibold text-slate-500">Active chats</p><p className="mt-2 text-2xl font-bold text-slate-950">{customers.reduce((total, customer) => total + Number(customer.activeChats || 0), 0)}</p></Card>
      </div>
      <Table columns={columns} data={pagedCustomers} />
      <Pagination page={page} pageSize={pageSize} total={customers.length} itemLabel="customers" onPageChange={setPage} onPageSizeChange={(value) => { setPageSize(value); setPage(1); }} />
    </>
  );
}
