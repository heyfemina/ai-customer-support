import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../../api/axios.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import Card from "../../components/common/Card.jsx";
import Badge from "../../components/common/Badge.jsx";
import Button from "../../components/common/Button.jsx";

const controls = [
  { id: "auth", state: "Active" },
  { id: "roles", state: "Active" },
  { id: "encryption", state: "Active" },
  { id: "twoFactor", state: "Ready" },
  { id: "backup", state: "Ready" },
  { id: "activity", state: "Active" },
  { id: "gdpr", state: "Ready" },
  { id: "firewall", state: "Active" },
  { id: "apiSecurity", state: "Active" },
];

export default function Security() {
  const { t } = useTranslation();
  const [backups, setBackups] = useState([]);
  const [gdprRequests, setGdprRequests] = useState([]);
  const [health, setHealth] = useState(null);
  const [notice, setNotice] = useState("");

  const loadOperationalData = () => {
    api.get("/backups").then(({ data }) => setBackups(data.data || [])).catch(() => {});
    api.get("/gdpr/requests").then(({ data }) => setGdprRequests(data.data || [])).catch(() => {});
    api.get("/admin/system-health").then(({ data }) => setHealth(data.data)).catch(() => {});
  };

  useEffect(() => {
    loadOperationalData();
  }, []);
  const createBackup = async () => {
    const { data } = await api.post("/backups/create");
    setNotice(`Backup ${data.data.status.toLowerCase()}`);
    loadOperationalData();
  };

  const updateGdpr = async (id, action) => {
    await api.put(`/gdpr/requests/${id}/${action}`, {});
    setNotice(`GDPR request ${action}d`);
    loadOperationalData();
  };

  return (
    <>
      <PageHeader title="Security settings" description="Authentication, compliance, API security, audit controls, and resilience placeholders." />
      {notice ? <p className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{notice}</p> : null}
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <Button variant="secondary" onClick={createBackup}>{t("security.actions.backup")}</Button>
        <Button variant="secondary" onClick={loadOperationalData}>{t("security.actions.securityCheck")}</Button>
      </div>
      <div className="mb-4 grid gap-4 xl:grid-cols-3">
        <Card className="p-5">
          <h2 className="font-semibold text-slate-950">System health</h2>
          <div className="mt-3 space-y-2 text-sm text-slate-600">
            <p>API: <b>{health?.api || "checking"}</b></p>
            <p>Database: <b>{health?.database || "checking"}</b></p>
            <p>Socket connections: <b>{health?.activeSocketConnections ?? 0}</b></p>
            <p>Open alerts: <b>{health?.alerts?.length ?? 0}</b></p>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3"><h2 className="font-semibold text-slate-950">Backup history</h2><Button variant="secondary" onClick={createBackup}>Create</Button></div>
          <div className="mt-3 space-y-2 text-sm">
            {backups.slice(0, 5).map((backup) => (
              <div key={backup.id} className="flex items-center justify-between gap-2 rounded-md bg-slate-50 p-2">
                <span>{backup.fileName}</span>
                <Badge tone={backup.status === "SUCCESS" ? "green" : backup.status === "FAILED" ? "red" : "amber"}>{backup.status}</Badge>
                {backup.status === "SUCCESS" ? <a className="font-semibold text-sky-700" href={`${api.defaults.baseURL}/backups/${backup.id}/download`}>Download</a> : null}
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold text-slate-950">GDPR requests</h2>
          <div className="mt-3 space-y-2 text-sm">
            {gdprRequests.slice(0, 5).map((request) => (
              <div key={request.id} className="rounded-md bg-slate-50 p-2">
                <div className="flex items-center justify-between gap-2"><span>{request.type} - {request.user?.email}</span><Badge>{request.status}</Badge></div>
                {request.status === "PENDING" ? <div className="mt-2 flex gap-2"><Button variant="secondary" onClick={() => updateGdpr(request.id, "approve")}>Approve</Button><Button variant="secondary" onClick={() => updateGdpr(request.id, "reject")}>Reject</Button></div> : null}
              </div>
            ))}
          </div>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {controls.map(({ id, state }) => (
          <Card key={id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-semibold text-slate-950">{t(`security.items.${id}.title`)}</h2>
              <Badge tone={state === "Active" ? "green" : state === "Ready" ? "blue" : "amber"}>{t(`security.states.${state}`, { defaultValue: state })}</Badge>
            </div>
            <p className="mt-3 text-sm text-slate-500">{t(`security.items.${id}.detail`)}</p>
          </Card>
        ))}
      </div>
    </>
  );
}
