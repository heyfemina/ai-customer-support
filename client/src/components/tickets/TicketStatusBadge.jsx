import Badge from "../common/Badge.jsx";
import { useTranslation } from "react-i18next";

const statusTone = {
  OPEN: "blue",
  IN_PROGRESS: "amber",
  WAITING_CUSTOMER: "violet",
  RESOLUTION_PROPOSED: "amber",
  CUSTOMER_RESPONDED_AFTER_RESOLUTION: "blue",
  AUTO_CLOSED: "slate",
  REOPENED: "blue",
  RESOLVED: "green",
  CLOSED: "slate",
};

export default function TicketStatusBadge({ status }) {
  const { t } = useTranslation();
  const value = String(status || "OPEN");
  return <Badge tone={statusTone[value] || "slate"}>{t(`status.${value}`, { defaultValue: value.replaceAll("_", " ") })}</Badge>;
}
