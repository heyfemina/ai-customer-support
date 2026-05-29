import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Bot } from "lucide-react";
import Button from "../../components/common/Button.jsx";
import Card from "../../components/common/Card.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { roleHome } from "../../utils/constants.js";

export default function Login() {
  const { authReady, isAuthenticated, login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (authReady && isAuthenticated) {
    const role = String(user?.role || "").toUpperCase();
    return <Navigate to={roleHome[role] || "/dashboard"} replace />;
  }

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const user = await login(form);
      if (user.requires2FA) {
        navigate("/verify-otp", { state: { tempLoginToken: user.tempLoginToken, email: user.user?.email, devOtp: user.devOtp } });
        return;
      }
      const role = String(user.role || "").toUpperCase();
      navigate(roleHome[role] || "/dashboard", { replace: true });
    } catch (error) {
      setError(error.friendlyMessage || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 sm:p-7">
      <div className="mb-6">
        <div className="mb-4 grid h-11 w-11 place-items-center rounded-md bg-slate-950 text-white lg:hidden">
          <Bot className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold text-slate-950">Login</h1>
        <p className="mt-1 text-sm text-slate-500">Use your real database account. After login, the app opens your saved role panel automatically.</p>
      </div>
      {location.state?.registered ? <p className="mb-4 rounded-md bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">Customer account created. Sign in to open the customer panel.</p> : null}
      <p className="mb-5 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">Admin and agent accounts are created by an admin in <b>Admin &gt; Users</b>. Public registration is only for customers.</p>
      <form className="space-y-4" onSubmit={submit}>
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">Email</span>
          <input className="mt-1 h-11 w-full rounded-md border border-slate-200 px-3 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">Password</span>
          <input type="password" className="mt-1 h-11 w-full rounded-md border border-slate-200 px-3 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
        </label>
        {error ? <p className="rounded-md bg-rose-50 p-3 text-sm font-medium text-rose-700">{error}</p> : null}
        <Button className="w-full" loading={loading}>Login</Button>
      </form>
      <div className="mt-5 flex items-center justify-between text-sm">
        <Link className="font-semibold text-teal-700" to="/forgot-password">Forgot password?</Link>
        <Link className="font-semibold text-teal-700" to="/register">Create customer account</Link>
      </div>
    </Card>
  );
}
