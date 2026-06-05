import { useEffect, useState } from "react";
import api from "../../api/axios.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import Table from "../../components/common/Table.jsx";
import Badge from "../../components/common/Badge.jsx";
import Card from "../../components/common/Card.jsx";
import Pagination from "../../components/common/Pagination.jsx";
import { normalizeItems } from "../../utils/helpers.js";

export default function Agents() {
  const [agents, setAgents] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  useEffect(() => {
    api.get("/reports/agents").then(({ data }) => setAgents(normalizeItems(data, []))).catch(() => setAgents([]));
  }, []);
  const pagedAgents = agents.slice((page - 1) * pageSize, page * pageSize);
  const columns = [
    { key: "name", label: "Agent" },
    { key: "email", label: "Email" },
    { key: "assignedTickets", label: "Assigned", align: "center", render: (row) => row.assignedTickets ?? row.assigned?.length ?? 0 },
    { key: "resolvedTickets", label: "Resolved", align: "center", render: (row) => row.resolvedTickets ?? 0 },
    { key: "avgFirstResponseMinutes", label: "First response", align: "center", render: (row) => row.avgFirstResponseMinutes ? `${row.avgFirstResponseMinutes}m` : "N/A" },
    { key: "avgResolutionMinutes", label: "Resolution", align: "center", render: (row) => row.avgResolutionMinutes ? `${row.avgResolutionMinutes}m` : "N/A" },
    { key: "complaintCount", label: "Complaints", align: "center", render: (row) => row.complaintCount ?? 0 },
    { key: "rating", label: "Rating", align: "center", render: (row) => `${row.rating || "N/A"}/5` },
    { key: "activeChats", label: "Active chats", align: "center", render: (row) => row.activeChats ?? 0 },
    { key: "status", label: "Status", align: "center", render: (row) => <Badge tone={row.isActive === false ? "red" : "green"}>{row.isActive === false ? "Inactive" : "Available"}</Badge> },
  ];
  const available = agents.filter((agent) => agent.isActive !== false).length;
  return (
    <>
      <PageHeader title="Agent management" description="Monitor assignments, availability, workload, and ratings." />
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <Card className="p-4"><p className="text-sm font-semibold text-slate-500">Total agents</p><p className="mt-2 text-2xl font-bold text-slate-950">{agents.length}</p></Card>
        <Card className="p-4"><p className="text-sm font-semibold text-slate-500">Available</p><p className="mt-2 text-2xl font-bold text-slate-950">{available}</p></Card>
        <Card className="p-4"><p className="text-sm font-semibold text-slate-500">Active chats</p><p className="mt-2 text-2xl font-bold text-slate-950">{agents.reduce((total, agent) => total + Number(agent.activeChats || 0), 0)}</p></Card>
      </div>
      <Table columns={columns} data={pagedAgents} paginated={false} />
      <Pagination page={page} pageSize={pageSize} total={agents.length} itemLabel="agents" onPageChange={setPage} onPageSizeChange={(value) => { setPageSize(value); setPage(1); }} />
    </>
  );
}
