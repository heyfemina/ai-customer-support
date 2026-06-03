import { Link } from "react-router-dom";
import Table from "../common/Table.jsx";
import Badge from "../common/Badge.jsx";
import TicketStatusBadge from "./TicketStatusBadge.jsx";
import { formatDate } from "../../utils/helpers.js";
import { Paperclip } from "lucide-react";

export default function TicketTable({ tickets, basePath = "/admin/tickets" }) {
  const columns = [
    { key: "id", label: "Ticket ID", render: (row) => <span className="font-mono text-xs text-slate-600">{row.id.slice(0, 8)}</span> },
    { key: "subject", labelKey: "table.subject", render: (row) => <Link className="font-semibold text-blue-700 hover:text-blue-900" to={`${basePath}/${row.id}`}>{row.subject}</Link> },
    { key: "customer", labelKey: "table.customer", render: (row) => <div><p className="font-semibold text-slate-800">{row.customer?.name || row.customerName || "Customer"}</p><p className="text-xs text-slate-500">{row.customer?.email}</p></div> },
    { key: "agent", labelKey: "table.agent", render: (row) => <div><p className="font-semibold text-slate-800">{row.agent?.name || row.agentName || "Unassigned"}</p><p className="text-xs text-slate-500">{row.agent?.email}</p></div> },
    { key: "category", label: "Category", render: (row) => row.category },
    { key: "priority", labelKey: "table.priority", render: (row) => <Badge tone={row.priority === "URGENT" || row.priority === "HIGH" ? "red" : "slate"}>{row.priority}</Badge> },
    { key: "status", labelKey: "table.status", render: (row) => <TicketStatusBadge status={row.status} /> },
    { key: "attachments", label: "Files", render: (row) => <span className="inline-flex items-center gap-1 text-sm text-slate-600"><Paperclip className="h-4 w-4" />{row.attachments?.length || 0}</span> },
    { key: "timing", label: "Timing", render: (row) => <span className="text-sm text-slate-600">{row.resolutionMinutes ? `${row.resolutionMinutes}m resolved` : row.firstResponseMinutes ? `${row.firstResponseMinutes}m first` : "Pending"}</span> },
    { key: "createdAt", labelKey: "table.created", render: (row) => formatDate(row.createdAt) },
    { key: "updatedAt", label: "Updated", render: (row) => formatDate(row.updatedAt) },
    { key: "action", label: "Action", render: (row) => <Link className="ticket-action-link" to={`${basePath}/${row.id}`}>{basePath.includes("/agent") ? "Open" : "View"}</Link> },
  ];

  return <Table columns={columns} data={tickets} empty="No tickets found" />;
}
