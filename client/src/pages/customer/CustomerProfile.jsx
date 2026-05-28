import PageHeader from "../../components/common/PageHeader.jsx";
import Card from "../../components/common/Card.jsx";
import Button from "../../components/common/Button.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useLanguage } from "../../context/LanguageContext.jsx";
import api from "../../api/axios.js";
import { useState } from "react";

export default function CustomerProfile() {
  const { user } = useAuth();
  const { language, changeLanguage } = useLanguage();
  const [twoFactorOn, setTwoFactorOn] = useState(Boolean(user?.twoFactorOn));
  const [notice, setNotice] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState([]);

  const toggle2FA = async () => {
    const endpoint = twoFactorOn ? "/auth/disable-2fa" : "/auth/enable-2fa";
    await api.post(endpoint);
    setTwoFactorOn(!twoFactorOn);
    setNotice(`Two-factor authentication ${twoFactorOn ? "disabled" : "enabled"}.`);
  };

  const generateCodes = async () => {
    const { data } = await api.post("/auth/generate-recovery-codes");
    setRecoveryCodes(data.data?.codes || []);
  };

  const requestExport = async () => {
    await api.post("/gdpr/export-request", { reason: "Customer requested data export" });
    setNotice("Data export request submitted.");
  };

  const requestDeletion = async () => {
    await api.post("/gdpr/delete-request", { reason: "Customer requested account deletion" });
    setNotice("Account deletion request submitted for admin review.");
  };

  return (
    <>
      <PageHeader title="Profile" description="Manage customer details, language, security preferences, and data privacy requests." actions={<Button>Save profile</Button>} />
      {notice ? <p className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{notice}</p> : null}
      <Card className="p-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <label><span className="text-sm font-semibold">Name</span><input className="mt-1 h-11 w-full rounded-md border border-slate-200 px-3" defaultValue={user?.name} /></label>
          <label><span className="text-sm font-semibold">Email</span><input className="mt-1 h-11 w-full rounded-md border border-slate-200 px-3" defaultValue={user?.email} /></label>
          <label><span className="text-sm font-semibold">Language</span><select value={language} onChange={(event) => changeLanguage(event.target.value)} className="mt-1 h-11 w-full rounded-md border border-slate-200 px-3"><option value="en">English</option><option value="it">Italian</option><option value="es">Spanish</option><option value="fr">French</option></select></label>
          <div className="rounded-md border border-slate-200 p-3">
            <p className="font-semibold">Two-factor authentication</p>
            <p className="mt-1 text-sm text-slate-500">Email OTP flow with development OTP display until SMTP is configured.</p>
            <div className="mt-3 flex flex-wrap gap-2"><Button variant="secondary" onClick={toggle2FA}>{twoFactorOn ? "Disable 2FA" : "Enable 2FA"}</Button><Button variant="secondary" onClick={generateCodes}>Generate recovery codes</Button></div>
            {recoveryCodes.length ? <div className="mt-3 rounded-md bg-slate-50 p-3 text-sm font-mono">{recoveryCodes.map((code) => <p key={code}>{code}</p>)}</div> : null}
          </div>
          <div className="rounded-md border border-slate-200 p-3">
            <p className="font-semibold">Privacy requests</p>
            <p className="mt-1 text-sm text-slate-500">Request export or deletion review under GDPR workflow.</p>
            <div className="mt-3 flex flex-wrap gap-2"><Button variant="secondary" onClick={requestExport}>Request data export</Button><Button variant="secondary" onClick={requestDeletion}>Request account deletion</Button></div>
          </div>
        </div>
      </Card>
    </>
  );
}
