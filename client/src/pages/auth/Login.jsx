import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Bot, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import Button from "../../components/common/Button.jsx";
import Card from "../../components/common/Card.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { roleHome } from "../../utils/constants.js";

const inputGroupClass = "mt-1.5 flex min-h-12 items-center overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100";
const iconSlotClass = "flex h-12 w-12 shrink-0 items-center justify-center border-r border-slate-200 bg-slate-50 text-slate-400";
const fieldClass = "min-w-0 flex-1 border-0 bg-transparent px-3 py-3 text-sm text-slate-950 outline-none placeholder:text-slate-400";
const passwordToggleClass = "mr-1.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-200";

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
    <Card className="w-full overflow-hidden border-slate-200 shadow-xl shadow-slate-200/70">
      <div className="border-b border-slate-200 bg-white px-5 py-5 sm:px-6">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-blue-900 text-white lg:hidden">
            <Bot className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-blue-700">AI Customer Support System</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-950">Sign in</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">Use your company or customer account. Access opens automatically based on your saved role.</p>
          </div>
        </div>
      </div>
      <div className="space-y-5 bg-slate-50/60 p-5 sm:p-6">
        {location.state?.registered ? (
          <p className="rounded-md border border-green-100 bg-green-50 p-3 text-sm font-semibold text-green-700">
            Customer account created. Sign in to open the customer panel.
          </p>
        ) : null}
        <form className="space-y-5" onSubmit={submit}>
          <label className="block">
            <span className="app-label">Email</span>
            <div className={inputGroupClass}>
              <span className={iconSlotClass}>
                <Mail className="h-4 w-4" />
              </span>
              <input type="email" autoComplete="email" className={fieldClass} placeholder="you@example.com" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            </div>
          </label>
          <label className="block">
            <span className="app-label">Password</span>
            <div className={inputGroupClass}>
              <span className={iconSlotClass}>
                <LockKeyhole className="h-4 w-4" />
              </span>
              <input type={showPassword ? "text" : "password"} autoComplete="current-password" className={fieldClass} placeholder="Enter password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
              <button type="button" className={passwordToggleClass} onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>
          {error ? <p className="rounded-md border border-red-100 bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p> : null}
          <Button className="min-h-12 w-full rounded-lg" loading={loading}>Sign In</Button>
        </form>
        <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 text-sm sm:flex-row sm:items-center sm:justify-between">
          <Link className="font-semibold text-blue-700" to="/forgot-password">Forgot password?</Link>
          <Link className="font-semibold text-blue-700" to="/register">Create customer account</Link>
        </div>
      </div>
    </Card>
  );
}
