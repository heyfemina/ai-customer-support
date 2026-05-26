import { useEffect, useState } from "react";
import api from "../../api/axios.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import Table from "../../components/common/Table.jsx";
import { formatDate, normalizeItems } from "../../utils/helpers.js";

const logs = [
  { id: "a1", user: "Ariana Admin", action: "Updated AI fallback message", ipAddress: "192.168.1.20", createdAt: "2026-05-26T08:20:00.000Z" },
  { id: "a2", user: "Marco Agent", action: "Transferred chat chat-2", ipAddress: "192.168.1.21", createdAt: "2026-05-26T08:10:00.000Z" },
  { id: "a3", user: "Clara Customer", action: "Created ticket tck-1004", ipAddress: "192.168.1.22", createdAt: "2026-05-25T16:12:00.000Z" },
];

export default function ActivityLogs() {
  const [items, setItems] = useState(logs);
  useEffect(() => {
    api.get("/activity-logs").then(({ data }) => setItems(normalizeItems(data, logs))).catch(() => setItems(logs));
  }, []);
  const columns = [
    { key: "user", label: "User", render: (row) => row.user?.name || row.user || "System" },
    { key: "action", label: "Action" },
    { key: "ipAddress", label: "IP address" },
    { key: "createdAt", label: "Date", render: (row) => formatDate(row.createdAt) },
  ];
  return <><PageHeader title="Activity logs" description="Audit user actions, security events, and operational changes." /><Table columns={columns} data={items} /></>;
}
