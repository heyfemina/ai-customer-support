import { useEffect, useState } from "react";
import api from "../../api/axios.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import Table from "../../components/common/Table.jsx";
import { formatDate, normalizeItems } from "../../utils/helpers.js";
import { demoStore } from "../../utils/demoStore.js";

export default function ActivityLogs() {
  const [items, setItems] = useState(demoStore.activityLogs());
  useEffect(() => {
    api.get("/activity-logs").then(({ data }) => setItems(normalizeItems(data, demoStore.activityLogs()))).catch(() => setItems(demoStore.activityLogs()));
  }, []);
  const columns = [
    { key: "user", label: "User", render: (row) => row.user?.name || row.user || "System" },
    { key: "action", label: "Action" },
    { key: "ipAddress", label: "IP address" },
    { key: "createdAt", label: "Date", render: (row) => formatDate(row.createdAt) },
  ];
  return <><PageHeader title="Activity logs" description="Audit user actions, security events, and operational changes." /><Table columns={columns} data={items} /></>;
}
