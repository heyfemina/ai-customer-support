import { useEffect, useState } from "react";
import api from "../../api/axios.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import Table from "../../components/common/Table.jsx";
import Badge from "../../components/common/Badge.jsx";
import Card from "../../components/common/Card.jsx";
import { normalizeItems } from "../../utils/helpers.js";

export default function Agents() {
  const [agents, setAgents] = useState([]);
  useEffect(() => {
    api.get("/reports/agents").then(({ data }) => setAgents(normalizeItems(data, []))).catch(() => setAgents([]));
  }, []);
  const columns = [
    { key: "name", label: "Agent" },
    { key: "email", label: "Email" },
    { key: "assignedTickets", label: "Assigned", render: (row) => row.assignedTickets ?? row.assigned?.length ?? 0 },
    { key: "rating", label: "Rating", render: (row) => `${row.rating || "N/A"}/5` },
    { key: "activeChats", label: "Active chats", render: (row) => row.activeChats ?? 0 },
    { key: "status", label: "Status", render: (row) => <Badge tone={row.isActive === false ? "red" : "green"}>{row.isActive === false ? "Inactive" : "Available"}</Badge> },
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
      <Table columns={columns} data={agents} />
    </>
  );
}
