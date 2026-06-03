import { Link } from "react-router-dom";
import Card from "../common/Card.jsx";
import Badge from "../common/Badge.jsx";
import TicketStatusBadge from "./TicketStatusBadge.jsx";
import { formatDate } from "../../utils/helpers.js";
import { Paperclip } from "lucide-react";
import Button from "../common/Button.jsx";

export default function TicketCard({ ticket, basePath = "/customer/tickets" }) {
  return (
    <Card className="p-5 transition hover:border-slate-300 hover:shadow-md">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="min-w-0">
          <Link to={`${basePath}/${ticket.id}`} className="font-semibold text-slate-900 hover:text-blue-700">
            {ticket.subject}
          </Link>
          <p className="mt-1 line-clamp-2 text-sm text-slate-500">{ticket.description}</p>
        </div>
        <TicketStatusBadge status={ticket.status} />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
        <Badge tone={ticket.priority === "URGENT" || ticket.priority === "HIGH" ? "red" : "slate"}>{ticket.priority}</Badge>
        <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1">{ticket.category}</span>
        <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1">{ticket.agent?.name || "Unassigned"}</span>
        <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1"><Paperclip className="h-3.5 w-3.5" />{ticket.attachments?.length || 0}</span>
        <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1">{formatDate(ticket.createdAt)}</span>
        <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1">Updated {formatDate(ticket.updatedAt)}</span>
      </div>
      <Link to={`${basePath}/${ticket.id}`} className="mt-4 inline-block">
        <Button variant="secondary">View Details</Button>
      </Link>
    </Card>
  );
}
