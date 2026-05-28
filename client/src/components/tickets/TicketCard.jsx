import { Link } from "react-router-dom";
import Card from "../common/Card.jsx";
import Badge from "../common/Badge.jsx";
import TicketStatusBadge from "./TicketStatusBadge.jsx";
import { formatDate } from "../../utils/helpers.js";

export default function TicketCard({ ticket, basePath = "/customer/tickets" }) {
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to={`${basePath}/${ticket.id}`} className="font-semibold text-slate-900 hover:text-teal-700">
            {ticket.subject}
          </Link>
          <p className="mt-1 line-clamp-2 text-sm text-slate-500">{ticket.description}</p>
        </div>
        <TicketStatusBadge status={ticket.status} />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <Badge tone={ticket.priority === "URGENT" || ticket.priority === "HIGH" ? "red" : "slate"}>{ticket.priority}</Badge>
        <span>{ticket.category}</span>
        <span>{formatDate(ticket.createdAt)}</span>
      </div>
    </Card>
  );
}
