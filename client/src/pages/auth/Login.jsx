import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Bot, Eye, EyeOff, LockKeyhole, ShieldCheck, UserRound } from "lucide-react";
import Button from "../../components/common/Button.jsx";
import Card from "../../components/common/Card.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { roleHome } from "../../utils/constants.js";

const roleHints = [
  { label: "Admin", text: "Full platform control" },
  { label: "Agent", text: "Tickets and live chats" },
  { label: "Customer", text: "Support requests" },
];

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
    <Card className="overflow-hidden">
      <div className="border-b border-slate-200 bg-slate-50 px-6 py-5 sm:px-7">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-md bg-blue-900 text-white lg:hidden">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-950">Sign in</h1>
            <p className="mt-1 text-sm text-slate-500">One login opens the correct workspace automatically.</p>
          </div>
        </div>
      </div>
      <div className="p-6 sm:p-7">
      <div className="mb-6">
        <div className="grid gap-2 sm:grid-cols-3">
          {roleHints.map((item) => (
            <div key={item.label} className="rounded-md border border-slate-200 bg-white p-3">
              <p className="text-sm font-bold text-slate-900">{item.label}</p>
              <p className="mt-1 text-xs text-slate-500">{item.text}</p>
            </div>
          ))}
        </div>
      </div>
      {location.state?.registered ? <p className="mb-4 rounded-md border border-green-100 bg-green-50 p-3 text-sm font-semibold text-green-700">Customer account created. Sign in to open the customer panel.</p> : null}
      <p className="mb-5 inline-flex w-full items-start gap-2 rounded-md border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> Admin, agent, and customer accounts use the same secure login.</p>
      <form className="space-y-4" onSubmit={submit}>
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">Email</span>
          <div className="relative mt-1">
            <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="email" autoComplete="email" className="app-field pl-10" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
          </div>
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">Password</span>
          <div className="relative mt-1">
            <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type={showPassword ? "text" : "password"} autoComplete="current-password" className="app-field pl-10 pr-11" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
            <button type="button" className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-blue-900" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </label>
        {error ? <p className="rounded-md border border-red-100 bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p> : null}
        <Button className="w-full" loading={loading}>Sign in and continue</Button>
      </form>
      <div className="mt-5 flex items-center justify-between text-sm">
        <Link className="font-semibold text-blue-700" to="/forgot-password">Forgot password?</Link>
        <Link className="font-semibold text-blue-700" to="/register">Create customer account</Link>
      </div>
      </div>
    </Card>
  );
}
