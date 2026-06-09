import { useEffect, useState } from "react";
import api from "../../api/axios.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import Table from "../../components/common/Table.jsx";
import Card from "../../components/common/Card.jsx";
import Pagination from "../../components/common/Pagination.jsx";
import { formatDate, normalizeItems } from "../../utils/helpers.js";
import { useTranslation } from "react-i18next";

export default function ActivityLogs() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({ search: "", role: "", userId: "", action: "", dateFrom: "", dateTo: "" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/users").then(({ data }) => setUsers(normalizeItems(data, []))).catch((error) => {
      setError(error.friendlyMessage || "Unable to load users for activity filters.");
    });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
    setLoading(true);
    setError("");
    api.get(`/activity-logs?${params.toString()}`).then(({ data }) => setItems(normalizeItems(data, []))).catch((error) => {
      setError(error.friendlyMessage || "Unable to load activity logs.");
    }).finally(() => setLoading(false));
  }, [filters]);

  const columns = [
    { key: "user", labelKey: "table.user", render: (row) => row.user?.name || row.user || t("common.system") },
    { key: "role", labelKey: "table.role", align: "center", render: (row) => row.user?.role || t("common.system") },
    { key: "email", labelKey: "table.email", render: (row) => row.user?.email || "-" },
    { key: "action", labelKey: "table.action" },
    { key: "ipAddress", labelKey: "table.ipAddress" },
    { key: "createdAt", labelKey: "table.date", align: "center", render: (row) => formatDate(row.createdAt) },
  ];
  const pagedItems = items.slice((page - 1) * pageSize, page * pageSize);
  const updateFilters = (patch) => {
    setFilters((current) => ({ ...current, ...patch }));
    setPage(1);
  };

  return (
    <>
      <PageHeader title={t("pages.activityLogs.title")} description={t("pages.activityLogs.description")} />
      {error ? <p className="mb-4 rounded-md border border-amber-100 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">{error}</p> : null}
      <Card className="mb-4 p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_160px_210px_180px_150px_150px]">
          <input className="app-field" placeholder={t("activity.searchNameEmail", { defaultValue: "Search name or email" })} value={filters.search} onChange={(event) => updateFilters({ search: event.target.value, userId: "" })} />
          <select className="app-field" value={filters.role} onChange={(event) => updateFilters({ role: event.target.value, userId: "" })}>
            <option value="">{t("activity.allRoles", { defaultValue: "All roles" })}</option>
            <option>ADMIN</option>
            <option>AGENT</option>
            <option>CUSTOMER</option>
          </select>
          <select className="app-field" value={filters.userId} onChange={(event) => updateFilters({ userId: event.target.value, search: "", role: "" })}>
            <option value="">{t("activity.selectUser", { defaultValue: "Select specific user" })}</option>
            {users.map((user) => <option key={user.id} value={user.id}>{user.name} - {user.role}</option>)}
          </select>
          <input className="app-field" placeholder={t("activity.actionContains", { defaultValue: "Action contains" })} value={filters.action} onChange={(event) => updateFilters({ action: event.target.value })} />
          <input type="date" className="app-field" value={filters.dateFrom} onChange={(event) => updateFilters({ dateFrom: event.target.value })} />
          <input type="date" className="app-field" value={filters.dateTo} onChange={(event) => updateFilters({ dateTo: event.target.value })} />
        </div>
      </Card>
      <Table columns={columns} data={pagedItems} paginated={false} />
      <Pagination page={page} pageSize={pageSize} total={items.length} itemLabel="logs" onPageChange={setPage} onPageSizeChange={(value) => { setPageSize(value); setPage(1); }} />
    </>
  );
}
