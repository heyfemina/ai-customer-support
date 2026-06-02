import { useEffect, useState } from "react";
import api from "../../api/axios.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import Table from "../../components/common/Table.jsx";
import Card from "../../components/common/Card.jsx";
import { formatDate, normalizeItems } from "../../utils/helpers.js";

export default function ActivityLogs() {
  const [items, setItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({ search: "", role: "", userId: "", action: "", dateFrom: "", dateTo: "" });

  useEffect(() => {
    api.get("/users").then(({ data }) => setUsers(normalizeItems(data, []))).catch(() => setUsers([]));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
    api.get(`/activity-logs?${params.toString()}`).then(({ data }) => setItems(normalizeItems(data, []))).catch(() => setItems([]));
  }, [filters]);

  const columns = [
    { key: "user", label: "User", render: (row) => row.user?.name || row.user || "System" },
    { key: "role", label: "Role", render: (row) => row.user?.role || "System" },
    { key: "email", label: "Email", render: (row) => row.user?.email || "-" },
    { key: "action", label: "Action" },
    { key: "ipAddress", label: "IP address" },
    { key: "createdAt", label: "Date", render: (row) => formatDate(row.createdAt) },
  ];

  return (
    <>
      <PageHeader title="Activity logs" description="Audit user actions, security events, and operational changes by agent or customer." />
      <Card className="mb-4 p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_160px_210px_180px_150px_150px]">
          <input className="app-field" placeholder="Search name or email" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value, userId: "" })} />
          <select className="app-field" value={filters.role} onChange={(event) => setFilters({ ...filters, role: event.target.value, userId: "" })}>
            <option value="">All roles</option>
            <option>ADMIN</option>
            <option>AGENT</option>
            <option>CUSTOMER</option>
          </select>
          <select className="app-field" value={filters.userId} onChange={(event) => setFilters({ ...filters, userId: event.target.value, search: "", role: "" })}>
            <option value="">Select specific user</option>
            {users.map((user) => <option key={user.id} value={user.id}>{user.name} - {user.role}</option>)}
          </select>
          <input className="app-field" placeholder="Action contains" value={filters.action} onChange={(event) => setFilters({ ...filters, action: event.target.value })} />
          <input type="date" className="app-field" value={filters.dateFrom} onChange={(event) => setFilters({ ...filters, dateFrom: event.target.value })} />
          <input type="date" className="app-field" value={filters.dateTo} onChange={(event) => setFilters({ ...filters, dateTo: event.target.value })} />
        </div>
      </Card>
      <Table columns={columns} data={items} />
    </>
  );
}
