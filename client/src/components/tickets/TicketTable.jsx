import { Link } from "react-router-dom";
import Table from "../common/Table.jsx";
import Badge from "../common/Badge.jsx";
import TicketStatusBadge from "./TicketStatusBadge.jsx";
import { formatDate } from "../../utils/helpers.js";
import { Paperclip } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function TicketTable({ tickets, basePath = "/admin/tickets", paginated = true }) {
  const { t } = useTranslation();
  const columns = [
    { key: "id", labelKey: "table.ticketId", render: (row) => <span className="font-mono text-xs text-slate-600">{row.id.slice(0, 8)}</span> },
    {
      key: "subject",
      labelKey: "table.subject",
      render: (row) => (
        <Link
          className="block max-w-[260px] truncate font-semibold text-blue-700 hover:text-blue-900"
          title={row.subject}
          to={`${basePath}/${row.id}`}
        >
          {row.subject}
        </Link>
      ),
    },
    { key: "customer", labelKey: "table.customer", render: (row) => <div><p className="font-semibold text-slate-800">{row.customer?.name || row.customerName || t("chat.customerFallback")}</p><p className="text-xs text-slate-500">{row.customer?.email}</p></div> },
    { key: "agent", labelKey: "table.agent", render: (row) => <div><p className="font-semibold text-slate-800">{row.agent?.name || row.agentName || t("ticketsUi.unassigned")}</p><p className="text-xs text-slate-500">{row.agent?.email}</p></div> },
    { key: "category", labelKey: "table.category", render: (row) => row.category },
    { key: "priority", labelKey: "table.priority", align: "center", render: (row) => <Badge tone={row.priority === "URGENT" || row.priority === "HIGH" ? "red" : "slate"}>{t(`priority.${row.priority}`, { defaultValue: row.priority })}</Badge> },
    { key: "status", labelKey: "table.status", align: "center", render: (row) => <TicketStatusBadge status={row.status} /> },
    { key: "attachments", labelKey: "table.files", align: "center", render: (row) => <span className="inline-flex items-center justify-center gap-1 text-sm text-slate-600"><Paperclip className="h-4 w-4" />{row.attachments?.length || 0}</span> },
    { key: "timing", labelKey: "table.timing", render: (row) => <span className="text-sm text-slate-600">{row.resolutionMinutes ? `${row.resolutionMinutes}m ${t("table.resolved").toLowerCase()}` : row.firstResponseMinutes ? `${row.firstResponseMinutes}m ${t("table.firstResponse").toLowerCase()}` : t("common.pending")}</span> },
    { key: "createdAt", labelKey: "table.created", render: (row) => formatDate(row.createdAt) },
    { key: "updatedAt", labelKey: "table.updated", render: (row) => formatDate(row.updatedAt) },
    { key: "action", labelKey: "table.action", align: "center", render: (row) => <Link className="ticket-action-link" to={`${basePath}/${row.id}`}>{basePath.includes("/agent") ? t("buttons.open", { defaultValue: "Open" }) : t("buttons.view", { defaultValue: "View" })}</Link> },
  ];

  return <Table columns={columns} data={tickets} empty="No tickets found" paginated={paginated} itemLabel="tickets" />;
}
