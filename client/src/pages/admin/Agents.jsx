import { useEffect, useState } from "react";
import api from "../../api/axios.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import Table from "../../components/common/Table.jsx";
import Badge from "../../components/common/Badge.jsx";
import { users } from "../../utils/dummyData.js";
import { normalizeItems } from "../../utils/helpers.js";

export default function Agents() {
  const [agents, setAgents] = useState(users.filter((user) => user.role === "AGENT"));
  useEffect(() => {
    api.get("/reports/agents").then(({ data }) => setAgents(normalizeItems(data, agents))).catch(() => null);
  }, []);
  const columns = [
    { key: "name", label: "Agent" },
    { key: "email", label: "Email" },
    { key: "assignedTickets", label: "Assigned", render: (row) => row.assignedTickets ?? row.assigned?.length ?? 0 },
    { key: "rating", label: "Rating", render: (row) => `${row.rating || "N/A"}/5` },
    { key: "activeChats", label: "Active chats", render: (row) => row.activeChats ?? 0 },
    { key: "status", label: "Status", render: (row) => <Badge tone={row.isActive === false ? "red" : "green"}>{row.isActive === false ? "Inactive" : "Available"}</Badge> },
  ];
  return <><PageHeader title="Agent management" description="Monitor assignments, availability, workload, and ratings." /><Table columns={columns} data={agents} /></>;
}
