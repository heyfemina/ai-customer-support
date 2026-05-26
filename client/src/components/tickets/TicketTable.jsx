import { Link } from "react-router-dom";
import Table from "../common/Table.jsx";
import Badge from "../common/Badge.jsx";
import TicketStatusBadge from "./TicketStatusBadge.jsx";
import { formatDate } from "../../utils/helpers.js";

export default function TicketTable({ tickets, basePath = "/admin/tickets" }) {
  const columns = [
    { key: "subject", labelKey: "table.subject", render: (row) => <Link className="font-semibold text-sky-700" to={`${basePath}/${row.id}`}>{row.subject}</Link> },
    { key: "customer", labelKey: "table.customer", render: (row) => row.customer?.name || row.customerName || "Customer" },
    { key: "agent", labelKey: "table.agent", render: (row) => row.agent?.name || row.agentName || "Unassigned" },
    { key: "priority", labelKey: "table.priority", render: (row) => <Badge tone={row.priority === "URGENT" || row.priority === "HIGH" ? "red" : "slate"}>{row.priority}</Badge> },
    { key: "status", labelKey: "table.status", render: (row) => <TicketStatusBadge status={row.status} /> },
    { key: "createdAt", labelKey: "table.created", render: (row) => formatDate(row.createdAt) },
  ];

  return <Table columns={columns} data={tickets} empty="No tickets found" />;
}
