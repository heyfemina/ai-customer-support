import Badge from "../common/Badge.jsx";

const statusTone = {
  OPEN: "blue",
  IN_PROGRESS: "amber",
  WAITING_CUSTOMER: "violet",
  RESOLVED: "green",
  CLOSED: "slate",
};

export default function TicketStatusBadge({ status }) {
  return <Badge tone={statusTone[status] || "slate"}>{String(status || "OPEN").replaceAll("_", " ")}</Badge>;
}
