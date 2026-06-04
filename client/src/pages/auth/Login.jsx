import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AlertCircle, Bot, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import Button from "../../components/common/Button.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { roleHome } from "../../utils/constants.js";

const inputShellClass = "mt-2 flex h-12 items-center rounded-md border border-[#D6DEE9] bg-white shadow-sm transition focus-within:border-[#2563EB] focus-within:ring-4 focus-within:ring-blue-100";
const iconClass = "grid h-full w-11 shrink-0 place-items-center border-r border-[#E2E8F0] text-slate-400";
const fieldClass = "h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-sm text-[#0F172A] outline-none placeholder:text-slate-400";
const labelClass = "block text-sm font-semibold text-[#0F172A]";
const linkClass = "font-semibold text-[#2563EB] transition hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-100";
const highlights = ["Role-based workspaces", "Live chat and ticket workflows", "Secure support operations"];

export default function Login() {
  const { authReady, isAuthenticated, login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (authReady && isAuthenticated) {
    const role = String(user?.role || "").toUpperCase();
    return <Navigate to={roleHome[role] || "/dashboard"} replace />;
  }

  const submit = async (event) => {
    event.preventDefault();
    if (!form.email.trim() || !form.password.trim()) {
      setError("Enter your email and password to continue.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await login({ email: form.email.trim(), password: form.password });
      if (result.requires2FA) {
        navigate("/verify-otp", { state: { tempLoginToken: result.tempLoginToken, email: result.user?.email, devOtp: result.devOtp, previewUrl: result.previewUrl } });
        return;
      }
      const role = String(result.role || "").toUpperCase();
      navigate(roleHome[role] || "/dashboard", { replace: true });
    } catch (error) {
      setError(error.friendlyMessage || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-[560px] overflow-hidden rounded-lg border border-[#D8E0EA] bg-white shadow-[0_24px_70px_rgba(15,23,42,0.12)] lg:grid-cols-[0.95fr_1.05fr]">
      <section className="hidden border-r border-[#D8E0EA] bg-[#F8FAFC] px-8 py-8 lg:flex lg:flex-col lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-md bg-[#2563EB] text-white shadow-sm">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-[#0F172A]">AI Customer Support</p>
              <p className="text-xs font-semibold text-[#64748B]">Operations Console</p>
            </div>
          </div>
          <div className="mt-12">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#2563EB]">Welcome back</p>
            <h1 className="mt-3 max-w-sm text-3xl font-bold leading-tight text-[#0F172A]">Manage every support conversation from one secure workspace.</h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-[#64748B]">
              Sign in to review tickets, monitor live chats, coordinate agents, and keep customer operations moving.
            </p>
          </div>
        </div>
        <div className="space-y-3">
          {highlights.map((item) => (
            <div key={item} className="flex items-center gap-3 rounded-md border border-[#E2E8F0] bg-white px-3.5 py-3 text-sm font-semibold text-[#334155] shadow-sm">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#2563EB]" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="flex items-center bg-white px-6 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto w-full max-w-[390px] space-y-6">
          <div className="lg:hidden">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-md bg-[#2563EB] text-white shadow-sm">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#0F172A]">AI Customer Support</p>
                <p className="text-xs font-semibold text-[#64748B]">Operations Console</p>
              </div>
            </div>
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.1em] text-[#2563EB]">Account access</p>
            <h2 className="mt-2 text-3xl font-bold text-[#0F172A]">Sign in</h2>
            <p className="mt-2 text-sm leading-6 text-[#64748B]">Sign in to manage support operations</p>
          </div>
        {location.state?.registered ? (
          <p className="rounded-md border border-green-200 bg-green-50 px-3 py-2.5 text-sm font-semibold text-green-700">
            Customer account created. Sign in to open the customer panel.
          </p>
        ) : null}
        <form className="space-y-5" onSubmit={submit}>
          <label className={labelClass}>
            Email
            <div className={inputShellClass}>
              <span className={iconClass}>
                <Mail className="h-4 w-4" />
              </span>
              <input type="email" autoComplete="email" className={fieldClass} placeholder="you@example.com" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            </div>
          </label>
          <label className={labelClass}>
            Password
            <div className={inputShellClass}>
              <span className={iconClass}>
                <LockKeyhole className="h-4 w-4" />
              </span>
              <input type={showPassword ? "text" : "password"} autoComplete="current-password" className={`${fieldClass} pr-1`} placeholder="Enter password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
              <button type="button" className="mr-1.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-100" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>
          {error ? (
            <p className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </p>
          ) : null}
          <Button className="h-12 w-full bg-[#2563EB] text-sm font-bold shadow-sm hover:bg-blue-700 focus:ring-blue-100" loading={loading}>Sign In</Button>
        </form>
        <div className="flex flex-col gap-3 border-t border-[#E2E8F0] pt-5 text-sm sm:flex-row sm:items-center sm:justify-between">
          <Link className={linkClass} to="/forgot-password">Forgot password?</Link>
          <Link className={linkClass} to="/register">Create customer account</Link>
        </div>
        </div>
      </section>
    </div>
  );
}
