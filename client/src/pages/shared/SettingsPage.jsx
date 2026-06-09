import { useEffect, useMemo, useState } from "react";
import { Download, ShieldCheck, UserRound } from "lucide-react";
import api from "../../api/axios.js";
import Badge from "../../components/common/Badge.jsx";
import Button from "../../components/common/Button.jsx";
import Card from "../../components/common/Card.jsx";
import PageHeader from "../../components/common/PageHeader.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { languageOptions, useLanguage } from "../../context/LanguageContext.jsx";
import { AUTH_USER_KEY } from "../../utils/constants.js";
import { useTheme } from "../../context/ThemeContext.jsx";

function persistUser(profile) {
  try {
    const stored = JSON.parse(sessionStorage.getItem(AUTH_USER_KEY) || "null");
    sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify({ ...stored, ...profile }));
  } catch {
    sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(profile));
  }
}

export default function SettingsPage({ role }) {
  const { user } = useAuth();
  const { language, changeLanguage } = useLanguage();
  const { themeId, setThemeId, themes } = useTheme();
  const [profile, setProfile] = useState(user || {});
  const [form, setForm] = useState({ name: user?.name || "", email: user?.email || "", language: user?.language || language });
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [notice, setNotice] = useState("");
  const [privacyRequests, setPrivacyRequests] = useState([]);
  const [privacyLoading, setPrivacyLoading] = useState(false);
  const [busy, setBusy] = useState("");

  useEffect(() => {
    setProfile(user || {});
    setForm({ name: user?.name || "", email: user?.email || "", language: user?.language || language });
  }, [user, language]);

  const normalizedRole = String(role || profile.role || "").toUpperCase();
  const title = `${normalizedRole.charAt(0)}${normalizedRole.slice(1).toLowerCase()} settings`;
  const twoFactorEnabled = Boolean(profile.twoFactorOn);
  const categories = useMemo(() => Array.isArray(profile.categories) ? profile.categories.join(", ") : profile.categories || "General", [profile.categories]);

  useEffect(() => {
    if (normalizedRole !== "CUSTOMER") return;
    setPrivacyLoading(true);
    api.get("/gdpr/requests/me").then(({ data }) => setPrivacyRequests(data.data || [])).catch((error) => {
      setNotice(error.friendlyMessage || "Unable to load privacy requests.");
    }).finally(() => setPrivacyLoading(false));
  }, [normalizedRole]);

  const saveProfile = async () => {
    setBusy("profile");
    setNotice("");
    try {
      const { data } = await api.put("/auth/profile", { name: form.name, language: form.language });
      const updated = data.data || data.user || data;
      setProfile(updated);
      persistUser(updated);
      changeLanguage(updated.language || form.language, { syncProfile: false });
      setNotice("Profile settings saved.");
    } catch (error) {
      setNotice(error.friendlyMessage || "Unable to save profile settings.");
    } finally {
      setBusy("");
    }
  };

  const toggle2FA = async () => {
    setBusy("2fa");
    setNotice("");
    try {
      const endpoint = twoFactorEnabled ? "/auth/disable-2fa" : "/auth/enable-2fa";
      const { data } = await api.post(endpoint);
      const updated = data.data || data.user || data;
      setProfile(updated);
      persistUser(updated);
      setNotice(`Two-factor authentication ${updated.twoFactorOn ? "enabled" : "disabled"}.`);
    } catch (error) {
      setNotice(error.friendlyMessage || "Unable to update two-factor authentication.");
    } finally {
      setBusy("");
    }
  };

  const passwordReady = passwords.current && passwords.next && passwords.confirm && passwords.next === passwords.confirm;
  const requestPrivacy = async (type) => {
    setBusy(`gdpr-${type}`);
    setNotice("");
    try {
      const endpoint = type === "EXPORT" ? "/gdpr/export-request" : "/gdpr/delete-request";
      await api.post(endpoint, { reason: `Customer requested ${type.toLowerCase()}` });
      const { data } = await api.get("/gdpr/requests/me");
      setPrivacyRequests(data.data || []);
      setNotice(type === "EXPORT" ? "Data export request submitted." : "Account deletion request submitted.");
    } catch (error) {
      setNotice(error.friendlyMessage || "Privacy request failed. Please check the backend API.");
    } finally {
      setBusy("");
    }
  };

  const downloadExport = async () => {
    setBusy("gdpr-download");
    setNotice("");
    try {
      const { data } = await api.get(`/gdpr/export/${user.id}`);
      const payload = data.data || data;
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `gdpr-export-${user.id}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setNotice("GDPR export downloaded.");
    } catch (error) {
      setNotice(error.friendlyMessage || "Unable to download GDPR export.");
    } finally {
      setBusy("");
    }
  };

  return (
    <>
      <PageHeader title={title} description="Manage profile, password, language, and two-factor authentication preferences." />
      {notice ? <p className="mb-4 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800">{notice}</p> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-5">
          <Card className="p-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <span className="grid h-10 w-10 place-items-center rounded-md bg-blue-50 text-blue-700 ring-1 ring-blue-100"><UserRound className="h-5 w-5" /></span>
              <div>
                <h2 className="font-semibold text-slate-950">Profile information</h2>
                <p className="mt-1 text-sm text-slate-500">Name, email, role, and language preference.</p>
              </div>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label><span className="app-label">Name</span><input className="app-field mt-1" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
              <label><span className="app-label">Email</span><input className="app-field mt-1 bg-slate-50" value={form.email} disabled /></label>
              <label><span className="app-label">Role</span><input className="app-field mt-1 bg-slate-50" value={normalizedRole} disabled /></label>
              <label>
                <span className="app-label">Language preference</span>
                <select className="app-field mt-1" value={form.language} onChange={(event) => setForm({ ...form, language: event.target.value })}>
                  {languageOptions.map((option) => <option key={option.code} value={option.code}>{option.label}</option>)}
                </select>
              </label>
            </div>
            <Button className="mt-4" loading={busy === "profile"} disabled={busy === "2fa"} onClick={saveProfile}>Save profile</Button>
          </Card>

          <Card className="p-5">
            <h2 className="font-semibold text-slate-950">Theme preference</h2>
            <p className="mt-1 text-sm text-slate-500">Choose a professional panel theme. Your selection is saved locally.</p>
            <select className="app-field mt-4" value={themeId} onChange={(event) => setThemeId(event.target.value)}>
              {Object.entries(themes).map(([id, theme]) => <option key={id} value={id}>{theme.name}</option>)}
            </select>
          </Card>

          {normalizedRole === "CUSTOMER" ? (
            <Card className="p-5">
              <h2 className="font-semibold text-slate-950">Privacy requests</h2>
              <p className="mt-1 text-sm text-slate-500">Request data export or account deletion review using the existing GDPR workflow.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="secondary" loading={busy === "gdpr-EXPORT"} onClick={() => requestPrivacy("EXPORT")}>Request data export</Button>
                <Button variant="secondary" loading={busy === "gdpr-DELETE"} onClick={() => requestPrivacy("DELETE")}>Request account deletion</Button>
              </div>
              <div className="mt-4 space-y-2">
                {!privacyLoading && privacyRequests.length ? privacyRequests.slice(0, 4).map((request) => (
                  <div key={request.id} className="flex flex-col gap-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{request.type}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{request.status === "PENDING" ? "Pending approval" : request.status === "REJECTED" ? "Rejected" : request.status === "APPROVED" || request.status === "COMPLETED" ? "Approved for download" : request.status}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge>{request.status}</Badge>
                      {request.type === "EXPORT" && ["APPROVED", "COMPLETED"].includes(request.status) ? <Button size="sm" variant="secondary" icon={Download} loading={busy === "gdpr-download"} onClick={downloadExport}>Download JSON</Button> : null}
                    </div>
                  </div>
                )) : null}
                {!privacyLoading && !privacyRequests.length ? <p className="text-sm text-slate-500">No privacy requests yet.</p> : null}
              </div>
            </Card>
          ) : null}

          <Card className="p-5">
            <h2 className="font-semibold text-slate-950">Change password</h2>
            <p className="mt-1 text-sm text-slate-500">Enter your current password and a new password.</p>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <label><span className="app-label">Current password</span><input type="password" className="app-field mt-1" value={passwords.current} onChange={(event) => setPasswords({ ...passwords, current: event.target.value })} /></label>
              <label><span className="app-label">New password</span><input type="password" className="app-field mt-1" value={passwords.next} onChange={(event) => setPasswords({ ...passwords, next: event.target.value })} /></label>
              <label><span className="app-label">Confirm password</span><input type="password" className="app-field mt-1" value={passwords.confirm} onChange={(event) => setPasswords({ ...passwords, confirm: event.target.value })} /></label>
            </div>
            <Button className="mt-4" variant="secondary" disabled={!passwordReady} onClick={() => setNotice("Password change requires a backend endpoint; use forgot password for now.")}>Change password</Button>
          </Card>
        </div>

        <aside className="space-y-5">
          <Card className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-slate-950">Two-factor authentication</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">Two-factor authentication adds extra security to your account.</p>
              </div>
              <Badge tone={twoFactorEnabled ? "green" : "slate"}>{twoFactorEnabled ? "Enabled" : "Disabled"}</Badge>
            </div>
            <Button className="mt-4 w-full" variant={twoFactorEnabled ? "danger" : "secondary"} loading={busy === "2fa"} disabled={busy === "profile"} onClick={toggle2FA}>
              {twoFactorEnabled ? "Disable 2FA" : "Enable 2FA"}
            </Button>
            <p className="mt-3 text-xs font-semibold text-slate-500">OTP verification is handled during login when two-factor authentication is active.</p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-700" />
              <h2 className="font-semibold text-slate-950">Role details</h2>
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <div><dt className="text-xs font-bold uppercase text-slate-400">Department</dt><dd className="mt-1 font-semibold text-slate-800">{profile.department || "General Support"}</dd></div>
              {normalizedRole === "AGENT" ? <div><dt className="text-xs font-bold uppercase text-slate-400">Categories / skills</dt><dd className="mt-1 font-semibold text-slate-800">{categories}</dd></div> : null}
              {normalizedRole === "AGENT" ? <div><dt className="text-xs font-bold uppercase text-slate-400">Agent status</dt><dd className="mt-1 font-semibold text-slate-800">{profile.agentStatus || "ONLINE"}</dd></div> : null}
              {normalizedRole === "AGENT" ? <div><dt className="text-xs font-bold uppercase text-slate-400">Max active chats</dt><dd className="mt-1 font-semibold text-slate-800">{profile.maxActiveChats || 3}</dd></div> : null}
              {normalizedRole === "ADMIN" ? <div><dt className="text-xs font-bold uppercase text-slate-400">Security summary</dt><dd className="mt-1 font-semibold text-slate-800">RBAC, activity logs, encryption, and 2FA controls available.</dd></div> : null}
              {normalizedRole === "CUSTOMER" ? <div><dt className="text-xs font-bold uppercase text-slate-400">Privacy</dt><dd className="mt-1 font-semibold text-slate-800">GDPR export/delete requests remain available from Profile.</dd></div> : null}
            </dl>
          </Card>
        </aside>
      </div>
    </>
  );
}
