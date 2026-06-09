import { useEffect, useState } from "react";
import api from "../../api/axios.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import Table from "../../components/common/Table.jsx";
import Badge from "../../components/common/Badge.jsx";
import Card from "../../components/common/Card.jsx";
import Pagination from "../../components/common/Pagination.jsx";
import { normalizeItems } from "../../utils/helpers.js";
import { useTranslation } from "react-i18next";

export default function Agents() {
  const { t } = useTranslation();
  const [agents, setAgents] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setLoading(true);
    setError("");
    api.get("/reports/agents").then(({ data }) => setAgents(normalizeItems(data, []))).catch((error) => {
      setError(error.friendlyMessage || "Unable to load live agent data.");
    }).finally(() => {
      setHasLoadedOnce(true);
      setLoading(false);
    });
  }, []);
  const pagedAgents = agents.slice((page - 1) * pageSize, page * pageSize);
  const columns = [
    { key: "name", labelKey: "table.agent" },
    { key: "email", labelKey: "table.email" },
    { key: "assignedTickets", labelKey: "table.assigned", align: "center", render: (row) => row.assignedTickets ?? row.assigned?.length ?? 0 },
    { key: "resolvedTickets", labelKey: "table.resolved", align: "center", render: (row) => row.resolvedTickets ?? 0 },
    { key: "avgFirstResponseMinutes", labelKey: "table.firstResponse", align: "center", render: (row) => row.avgFirstResponseMinutes ? `${row.avgFirstResponseMinutes}m` : t("common.notAvailable") },
    { key: "avgResolutionMinutes", labelKey: "table.resolution", align: "center", render: (row) => row.avgResolutionMinutes ? `${row.avgResolutionMinutes}m` : t("common.notAvailable") },
    { key: "complaintCount", labelKey: "table.complaints", align: "center", render: (row) => row.complaintCount ?? 0 },
    { key: "rating", labelKey: "table.rating", align: "center", render: (row) => `${row.rating || t("common.notAvailable")}/5` },
    { key: "activeChats", labelKey: "table.activeChats", align: "center", render: (row) => row.activeChats ?? 0 },
    { key: "status", labelKey: "table.status", align: "center", render: (row) => <Badge tone={row.isActive === false ? "red" : "green"}>{row.isActive === false ? t("common.inactive") : t("common.available")}</Badge> },
  ];
  const available = agents.filter((agent) => agent.isActive !== false).length;
  return (
    <>
      <PageHeader title={t("pages.agents.title")} description={t("pages.agents.description")} />
      {error ? <p className="mb-4 rounded-md border border-amber-100 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">{error}</p> : null}
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <Card className="p-4"><p className="text-sm font-semibold text-slate-500">{t("common.totalAgents")}</p><p className="mt-2 text-2xl font-bold text-slate-950">{agents.length}</p></Card>
        <Card className="p-4"><p className="text-sm font-semibold text-slate-500">{t("common.available")}</p><p className="mt-2 text-2xl font-bold text-slate-950">{available}</p></Card>
        <Card className="p-4"><p className="text-sm font-semibold text-slate-500">{t("table.activeChats")}</p><p className="mt-2 text-2xl font-bold text-slate-950">{agents.reduce((total, agent) => total + Number(agent.activeChats ?? 0), 0)}</p></Card>
      </div>
      <Table columns={columns} data={pagedAgents} paginated={false} />
      <Pagination page={page} pageSize={pageSize} total={agents.length} itemLabel="agents" onPageChange={setPage} onPageSizeChange={(value) => { setPageSize(value); setPage(1); }} />
    </>
  );
}
