import { Link } from "react-router-dom";
import { useState } from "react";
import { Mail, Send } from "lucide-react";
import Button from "../../components/common/Button.jsx";
import Card from "../../components/common/Card.jsx";
import api from "../../api/axios.js";
import { useTranslation } from "react-i18next";

const inputGroupClass = "mt-1.5 flex min-h-12 items-center overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100";
const iconSlotClass = "flex h-12 w-12 shrink-0 items-center justify-center border-r border-slate-200 bg-slate-50 text-slate-400";
const fieldClass = "min-w-0 flex-1 border-0 bg-transparent px-3 py-3 text-sm text-slate-950 outline-none placeholder:text-slate-400";

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("mathilde8@ethereal.email");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setPreviewUrl("");
    setError("");

    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      setMessage(data.message || t("auth.resetSent"));
      setPreviewUrl(data.data?.previewUrl || "");
    } catch (err) {
      setError(err.friendlyMessage || t("auth.resetFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full overflow-hidden border-slate-200 shadow-xl shadow-slate-200/70">
      <div className="border-b border-slate-200 bg-white px-6 py-6 sm:px-7">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700">
            <Send className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-blue-700">{t("auth.recovery")}</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-950">{t("auth.resetPassword")}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">{t("auth.resetHelp")}</p>
          </div>
        </div>
      </div>
      <form className="space-y-5 bg-slate-50/60 p-6 sm:p-7" onSubmit={submit}>
        <label className="block">
          <span className="app-label">{t("auth.email")}</span>
          <div className={inputGroupClass}>
            <span className={iconSlotClass}>
              <Mail className="h-4 w-4" />
            </span>
            <input type="email" className={fieldClass} placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </div>
        </label>
        {message ? <p className="rounded-md border border-green-100 bg-green-50 p-3 text-sm font-medium text-green-700">{message}</p> : null}
        {previewUrl ? (
          <a className="block rounded-md bg-blue-50 p-3 text-sm font-semibold text-blue-700" href={previewUrl} target="_blank" rel="noreferrer">
            {t("auth.openEthereal")}
          </a>
        ) : null}
        {error ? <p className="rounded-md border border-red-100 bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p> : null}
        <Button className="min-h-12 w-full rounded-lg" loading={loading}>{t("auth.sendResetLink")}</Button>
        <p className="border-t border-slate-200 pt-5 text-sm text-slate-500">
          {t("auth.rememberedPassword")} <Link className="font-semibold text-blue-700" to="/login">{t("auth.backToLogin")}</Link>
        </p>
      </form>
    </Card>
  );
}

