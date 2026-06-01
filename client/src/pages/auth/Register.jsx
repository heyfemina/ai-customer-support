import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Eye, EyeOff, LockKeyhole, Mail, UserRound } from "lucide-react";
import Button from "../../components/common/Button.jsx";
import Card from "../../components/common/Card.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "", language: "en" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setError("Name, email, and password are required.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const { confirmPassword: _, ...payload } = form;
      await register({ ...payload, email: payload.email.trim(), name: payload.name.trim() });
      navigate("/login", { state: { registered: true } });
    } catch (error) {
      setError(error.friendlyMessage || "Registration failed. Please check your details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-slate-200 bg-slate-50 px-6 py-5 sm:px-7">
        <h1 className="text-2xl font-bold text-slate-950">Create customer account</h1>
        <p className="mt-1 text-sm text-slate-500">Customers can register here. Admin and agent accounts are created by an admin.</p>
      </div>
      <form className="space-y-4 p-6 sm:p-7" onSubmit={submit}>
        {error ? <p className="rounded-md border border-red-100 bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p> : null}
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">Full name</span>
          <div className="relative mt-1">
            <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="app-field pl-10" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
          </div>
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">Email</span>
          <div className="relative mt-1">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="email" autoComplete="email" className="app-field pl-10" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
          </div>
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">Password</span>
          <div className="relative mt-1">
            <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type={showPassword ? "text" : "password"} autoComplete="new-password" className="app-field pl-10 pr-11" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
            <button type="button" className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-blue-900" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">Confirm password</span>
          <div className="relative mt-1">
            <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type={showConfirmPassword ? "text" : "password"} autoComplete="new-password" className="app-field pl-10 pr-11" value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} required />
            <button type="button" className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-blue-900" onClick={() => setShowConfirmPassword((value) => !value)} aria-label={showConfirmPassword ? "Hide password" : "Show password"}>
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">Language</span>
          <select className="app-field mt-1" value={form.language} onChange={(event) => setForm({ ...form, language: event.target.value })}>
            <option value="en">English</option>
            <option value="it">Italian</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
          </select>
        </label>
        <Button className="w-full" loading={loading}>Create customer account</Button>
        <p className="text-sm text-slate-500">Already registered? <Link className="font-semibold text-blue-700" to="/login">Sign in</Link></p>
      </form>
    </Card>
  );
}

