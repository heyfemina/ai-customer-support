import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import Button from "../../components/common/Button.jsx";
import Card from "../../components/common/Card.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useTranslation } from "react-i18next";

const inputGroupClass = "mt-1.5 flex min-h-12 items-center overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100";
const iconSlotClass = "flex h-12 w-12 shrink-0 items-center justify-center border-r border-slate-200 bg-slate-50 text-slate-400";
const fieldClass = "min-w-0 flex-1 border-0 bg-transparent px-3 py-3 text-sm text-slate-950 outline-none placeholder:text-slate-400";
const passwordToggleClass = "mr-1.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-200";

export default function Register() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setError(t("auth.registrationRequired"));
      return;
    }
    if (form.password.length < 6) {
      setError(t("auth.passwordTooShort"));
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError(t("auth.passwordsMismatch"));
      return;
    }
    setLoading(true);
    try {
      const { confirmPassword: _, ...payload } = form;
      await register({ ...payload, email: payload.email.trim(), name: payload.name.trim() });
      navigate("/login", { state: { registered: true } });
    } catch (error) {
      setError(error.friendlyMessage || t("auth.registrationFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full overflow-hidden border-slate-200 shadow-xl shadow-slate-200/70">
      <div className="border-b border-slate-200 bg-white px-5 py-5 sm:px-6">
        <p className="text-xs font-bold uppercase tracking-wide text-blue-700">{t("auth.customerAccess")}</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-950">{t("auth.createCustomerAccount")}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">{t("auth.registerHelp")}</p>
      </div>
      <form className="space-y-5 bg-slate-50/60 p-5 sm:p-6" onSubmit={submit}>
        {error ? <p className="rounded-md border border-red-100 bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p> : null}
        <label className="block">
          <span className="app-label">{t("auth.fullName")}</span>
          <div className={inputGroupClass}>
            <span className={iconSlotClass}>
              <UserRound className="h-4 w-4" />
            </span>
            <input className={fieldClass} placeholder={t("auth.yourName")} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
          </div>
        </label>
        <label className="block">
          <span className="app-label">{t("auth.emailAddress")}</span>
          <div className={inputGroupClass}>
            <span className={iconSlotClass}>
              <Mail className="h-4 w-4" />
            </span>
            <input type="email" autoComplete="email" className={fieldClass} placeholder="you@example.com" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
          </div>
        </label>
        <label className="block">
          <span className="app-label">{t("auth.password")}</span>
          <div className={inputGroupClass}>
            <span className={iconSlotClass}>
              <LockKeyhole className="h-4 w-4" />
            </span>
            <input type={showPassword ? "text" : "password"} autoComplete="new-password" className={fieldClass} placeholder={t("auth.minimumPassword")} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
            <button type="button" className={passwordToggleClass} onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </label>
        <label className="block">
          <span className="app-label">{t("auth.confirmPassword")}</span>
          <div className={inputGroupClass}>
            <span className={iconSlotClass}>
              <LockKeyhole className="h-4 w-4" />
            </span>
            <input type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" className={fieldClass} placeholder={t("auth.repeatPassword")} value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} required />
            <button type="button" className={passwordToggleClass} onClick={() => setShowConfirmPassword((value) => !value)} aria-label={showConfirmPassword ? t("auth.hidePassword") : t("auth.showPassword")}>
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </label>
        <Button className="min-h-12 w-full rounded-lg" loading={loading}>{t("auth.createCustomerAccount")}</Button>
        <p className="border-t border-slate-200 pt-5 text-sm text-slate-500">{t("auth.alreadyRegistered")} <Link className="font-semibold text-blue-700" to="/login">{t("auth.signIn")}</Link></p>
      </form>
    </Card>
  );
}

