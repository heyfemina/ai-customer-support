import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bot } from "lucide-react";
import Button from "../../components/common/Button.jsx";
import Card from "../../components/common/Card.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { roleHome } from "../../utils/constants.js";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "admin@example.com", password: "admin123" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const user = await login(form);
      navigate(roleHome[user.role], { replace: true });
    } catch {
      setError("Invalid credentials. Try one of the demo accounts.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="mb-6">
        <div className="mb-4 grid h-11 w-11 place-items-center rounded-md bg-sky-600 text-white lg:hidden">
          <Bot className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold text-slate-950">Sign in</h1>
        <p className="mt-1 text-sm text-slate-500">Use admin@example.com, agent@example.com, or customer@example.com.</p>
      </div>
      <form className="space-y-4" onSubmit={submit}>
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">Email</span>
          <input className="mt-1 h-11 w-full rounded-md border border-slate-200 px-3 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">Password</span>
          <input type="password" className="mt-1 h-11 w-full rounded-md border border-slate-200 px-3 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
        </label>
        {error ? <p className="rounded-md bg-rose-50 p-3 text-sm font-medium text-rose-700">{error}</p> : null}
        <Button className="w-full" loading={loading}>Sign in securely</Button>
      </form>
      <div className="mt-5 flex items-center justify-between text-sm">
        <Link className="font-semibold text-sky-700" to="/forgot-password">Forgot password?</Link>
        <Link className="font-semibold text-sky-700" to="/register">Create account</Link>
      </div>
    </Card>
  );
}
