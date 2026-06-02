import { Link } from "react-router-dom";
import Table from "../common/Table.jsx";
import Badge from "../common/Badge.jsx";
import TicketStatusBadge from "./TicketStatusBadge.jsx";
import { formatDate } from "../../utils/helpers.js";

export default function TicketTable({ tickets, basePath = "/admin/tickets" }) {
  const columns = [
    { key: "subject", labelKey: "table.subject", render: (row) => <Link className="font-semibold text-blue-700 hover:text-blue-900" to={`${basePath}/${row.id}`}>{row.subject}</Link> },
    { key: "customer", labelKey: "table.customer", render: (row) => <div><p className="font-semibold text-slate-800">{row.customer?.name || row.customerName || "Customer"}</p><p className="text-xs text-slate-500">{row.customer?.email}</p></div> },
    { key: "agent", labelKey: "table.agent", render: (row) => <div><p className="font-semibold text-slate-800">{row.agent?.name || row.agentName || "Unassigned"}</p><p className="text-xs text-slate-500">{row.agent?.email}</p></div> },
    { key: "priority", labelKey: "table.priority", render: (row) => <Badge tone={row.priority === "URGENT" || row.priority === "HIGH" ? "red" : "slate"}>{row.priority}</Badge> },
    { key: "status", labelKey: "table.status", render: (row) => <TicketStatusBadge status={row.status} /> },
    { key: "timing", label: "Timing", render: (row) => <span className="text-sm text-slate-600">{row.resolutionMinutes ? `${row.resolutionMinutes}m` : row.firstResponseMinutes ? `${row.firstResponseMinutes}m first` : "Pending"}</span> },
    { key: "createdAt", labelKey: "table.created", render: (row) => formatDate(row.createdAt) },
  ];

  return <Table columns={columns} data={tickets} empty="No tickets found" />;
}
