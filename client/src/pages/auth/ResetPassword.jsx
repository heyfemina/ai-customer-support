import { useState } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Button from "../../components/common/Button.jsx";
import Card from "../../components/common/Card.jsx";
import api from "../../api/axios.js";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post(`/auth/reset-password/${token}`, { password: form.password });
      setMessage(data.message || "Password reset successfully");
      setTimeout(() => navigate("/login", { replace: true }), 1200);
    } catch (err) {
      setError(err.friendlyMessage || "Could not reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="overflow-hidden border border-slate-200 bg-white shadow-xl shadow-slate-200/70">
      <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-5 sm:px-7">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
          <LockKeyhole size={22} />
        </div>
        <h1 className="mt-4 text-2xl font-bold text-slate-950">Set new password</h1>
        <p className="mt-1 text-sm text-slate-500">Choose a strong password to protect your support workspace.</p>
      </div>
      <div className="px-6 py-6 sm:px-7">
      <form className="mt-6 space-y-4" onSubmit={submit}>
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">New password</span>
          <div className="relative mt-1">
            <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type={showPassword ? "text" : "password"}
              className="app-field pl-10 pr-12"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              minLength={6}
              required
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">Confirm password</span>
          <div className="relative mt-1">
            <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type={showConfirmPassword ? "text" : "password"}
              className="app-field pl-10 pr-12"
              value={form.confirmPassword}
              onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
              minLength={6}
              required
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              onClick={() => setShowConfirmPassword((value) => !value)}
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>
        {message ? <p className="rounded-md border border-green-100 bg-green-50 p-3 text-sm font-medium text-green-700">{message}</p> : null}
        {error ? <p className="rounded-md border border-red-100 bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p> : null}
        <Button className="w-full" loading={loading}>Reset password</Button>
      </form>
      <Link className="mt-5 inline-block text-sm font-semibold text-blue-700" to="/login">Back to login</Link>
      </div>
    </Card>
  );
}

