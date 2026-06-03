import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import api from "../../api/axios.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import Card from "../../components/common/Card.jsx";
import Badge from "../../components/common/Badge.jsx";
import Button from "../../components/common/Button.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { formatDate } from "../../utils/helpers.js";

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

function formatBytes(value) {
  if (!value && value !== 0) return "N/A";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Security() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [backups, setBackups] = useState([]);
  const [gdprRequests, setGdprRequests] = useState([]);
  const [health, setHealth] = useState(null);
  const [notice, setNotice] = useState("");
  const [backupBusy, setBackupBusy] = useState(false);
  const [deletingBackupId, setDeletingBackupId] = useState("");
  const [twoFactorOn, setTwoFactorOn] = useState(Boolean(user?.twoFactorOn));
  const [twoFactorTest, setTwoFactorTest] = useState(null);
  const [twoFactorBusy, setTwoFactorBusy] = useState(false);

  const loadOperationalData = () => {
    api.get("/backups").then(({ data }) => setBackups(data.data || [])).catch(() => {});
    api.get("/gdpr/requests").then(({ data }) => setGdprRequests(data.data || [])).catch(() => {});
    api.get("/admin/system-health").then(({ data }) => setHealth(data.data)).catch(() => {});
  };

  useEffect(() => {
    loadOperationalData();
  }, []);

  useEffect(() => {
    setTwoFactorOn(Boolean(user?.twoFactorOn));
  }, [user?.twoFactorOn]);

  const createBackup = async () => {
    setBackupBusy(true);
    setNotice("");
    try {
      const { data } = await api.post("/backups/create");
      setNotice(`Backup ${data.data.status.toLowerCase()}`);
      loadOperationalData();
    } catch (error) {
      setNotice(error.friendlyMessage || "Unable to create backup.");
    } finally {
      setBackupBusy(false);
    }
  };

  const downloadBackup = async (backup) => {
    try {
      const { data } = await api.get(`/backups/${backup.id}/download`, { responseType: "blob" });
      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = backup.fileName;
      link.click();
      URL.revokeObjectURL(url);
      setNotice(`Downloaded ${backup.fileName}`);
    } catch (error) {
      setNotice(error.friendlyMessage || "Unable to download backup.");
    }
  };

  const deleteBackup = async (backup) => {
    setDeletingBackupId(backup.id);
    try {
      await api.delete(`/backups/${backup.id}`);
      setNotice(`Deleted ${backup.fileName}`);
      loadOperationalData();
    } catch (error) {
      setNotice(error.friendlyMessage || "Unable to delete backup.");
    } finally {
      setDeletingBackupId("");
    }
  };

  const toggle2FA = async () => {
    setTwoFactorBusy(true);
    setTwoFactorTest(null);
    try {
      const endpoint = twoFactorOn ? "/auth/disable-2fa" : "/auth/enable-2fa";
      const { data } = await api.post(endpoint);
      const updatedUser = data.data || data.user || data;
      setTwoFactorOn(Boolean(updatedUser.twoFactorOn));
      setNotice(`Two-factor authentication ${updatedUser.twoFactorOn ? "enabled" : "disabled"} for ${updatedUser.email}.`);
    } catch (error) {
      setNotice(error.friendlyMessage || "Unable to update two-factor authentication.");
    } finally {
      setTwoFactorBusy(false);
    }
  };

  const test2FAEmail = async () => {
    setTwoFactorBusy(true);
    setTwoFactorTest(null);
    try {
      const { data } = await api.post("/auth/test-2fa-email");
      const result = data.data || data;
      setTwoFactorTest(result);
      setNotice(`Two-factor test code sent to ${result.email}.`);
    } catch (error) {
      setNotice(error.friendlyMessage || "Unable to send two-factor test email.");
    } finally {
      setTwoFactorBusy(false);
    }
  };

  const updateGdpr = async (id, action) => {
    await api.put(`/gdpr/requests/${id}/${action}`, {});
    setNotice(`GDPR request ${action}d`);
    loadOperationalData();
  };

  const exportGdpr = async (userId) => {
    const { data } = await api.get(`/gdpr/export/${userId}`);
    const payload = data.data || data;
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `gdpr-export-${userId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const readiness = health?.readiness || {};

  return (
    <>
      <PageHeader title="Security settings" description="Authentication, compliance, API security, audit controls, and resilience placeholders." />
      {notice ? <p className="mb-4 rounded-md bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">{notice}</p> : null}
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <Button variant="secondary" loading={backupBusy} onClick={createBackup}>Create Backup Now</Button>
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
            <p>Environment: <b>{readiness.nodeEnv || "development"}</b></p>
            <p>Production ready: <b>{readiness.productionReady ? "Yes" : "No"}</b></p>
            {readiness.missingRequired?.length ? <p className="text-red-600">Missing required: {readiness.missingRequired.join(", ")}</p> : null}
            {readiness.missingIntegrations?.length ? <p className="text-amber-700">Integration setup needed: {readiness.missingIntegrations.join(", ")}</p> : null}
            <p>Firewall/WAF: <b>{readiness.firewallWaf || "hosting-level setup required"}</b></p>
            <p>Monitoring: <b>{readiness.monitoring || "not configured"}</b></p>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-slate-950">Backup history</h2>
            <Button variant="secondary" loading={backupBusy} onClick={createBackup}>Create</Button>
          </div>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-sm">
              <thead>
                <tr className="text-left text-xs font-bold uppercase text-slate-500">
                  <th className="py-2 pr-3">File</th>
                  <th className="py-2 pr-3">Provider</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Size</th>
                  <th className="py-2 pr-3">Created</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {backups.length ? backups.map((backup) => (
                  <tr key={backup.id} className="align-top">
                    <td className="max-w-52 whitespace-normal py-3 pr-3 font-semibold text-slate-700">{backup.fileName}</td>
                    <td className="py-3 pr-3 text-slate-600">{backup.provider}</td>
                    <td className="py-3 pr-3">
                      <Badge tone={backup.status === "SUCCESS" ? "green" : backup.status === "FAILED" ? "red" : "amber"}>{backup.status}</Badge>
                      {backup.errorMessage ? <p className="mt-1 max-w-56 whitespace-normal text-xs text-red-600">{backup.errorMessage}</p> : null}
                    </td>
                    <td className="py-3 pr-3 text-slate-600">{formatBytes(backup.sizeBytes)}</td>
                    <td className="py-3 pr-3 text-slate-600">{formatDate(backup.createdAt)}</td>
                    <td className="py-3 pr-3">
                      <div className="flex flex-wrap gap-2">
                        <Button variant="secondary" disabled={backup.status !== "SUCCESS"} onClick={() => downloadBackup(backup)}>Download</Button>
                        <Button variant="danger" loading={deletingBackupId === backup.id} onClick={() => deleteBackup(backup)}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-500">No backups yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="font-semibold text-slate-950">GDPR requests</h2>
          <div className="mt-3 space-y-2 text-sm">
            {gdprRequests.slice(0, 5).map((request) => (
              <div key={request.id} className="rounded-md bg-slate-50 p-2">
                <div className="flex items-center justify-between gap-2"><span>{request.type} - {request.user?.email}</span><Badge>{request.status}</Badge></div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => exportGdpr(request.userId)}>Export</Button>
                  {request.status === "PENDING" ? <><Button variant="secondary" onClick={() => updateGdpr(request.id, "approve")}>Approve</Button><Button variant="secondary" onClick={() => updateGdpr(request.id, "reject")}>Reject</Button></> : null}
                </div>
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
              {id === "twoFactor" ? (
                <Badge tone={twoFactorOn ? "green" : "blue"}>{twoFactorOn ? "Enabled" : "Ready"}</Badge>
              ) : (
                <Badge tone={state === "Active" ? "green" : state === "Ready" ? "blue" : "amber"}>{t(`security.states.${state}`, { defaultValue: state })}</Badge>
              )}
            </div>
            <p className="mt-3 text-sm text-slate-500">{t(`security.items.${id}.detail`)}</p>
            {id === "twoFactor" ? (
              <div className="mt-4 space-y-3">
                <p className="rounded-md bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                  Email OTP for {user?.email || "current admin"}
                </p>
                <div className="grid gap-2">
                  <Button variant={twoFactorOn ? "danger" : "secondary"} loading={twoFactorBusy} onClick={toggle2FA}>
                    {twoFactorOn ? "Disable email 2FA" : "Enable email 2FA"}
                  </Button>
                  <Button variant="secondary" loading={twoFactorBusy} onClick={test2FAEmail}>
                    Send test code
                  </Button>
                </div>
                {twoFactorTest ? (
                  <div className="space-y-2 rounded-md border border-green-100 bg-green-50 p-3 text-sm text-green-800">
                    <p className="font-semibold">Test email sent</p>
                    {twoFactorTest.devOtp ? <p>Development OTP: <b>{twoFactorTest.devOtp}</b></p> : null}
                    {twoFactorTest.previewUrl ? (
                      <a className="font-semibold text-green-900 underline" href={twoFactorTest.previewUrl} target="_blank" rel="noreferrer">
                        Open Ethereal preview
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </Card>
        ))}
      </div>
    </>
  );
}

