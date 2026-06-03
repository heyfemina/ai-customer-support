import { useState } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Button from "../../components/common/Button.jsx";
import Card from "../../components/common/Card.jsx";
import api from "../../api/axios.js";

const inputGroupClass = "mt-1.5 flex min-h-12 items-center overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100";
const iconSlotClass = "flex h-12 w-12 shrink-0 items-center justify-center border-r border-slate-200 bg-slate-50 text-slate-400";
const fieldClass = "min-w-0 flex-1 border-0 bg-transparent px-3 py-3 text-sm text-slate-950 outline-none placeholder:text-slate-400";
const passwordToggleClass = "mr-1.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-200";

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
    <Card className="w-full overflow-hidden border-slate-200 shadow-xl shadow-slate-200/70">
      <div className="border-b border-slate-200 bg-white px-6 py-6 sm:px-7">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Secure recovery</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-950">Set new password</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">Choose a strong password to protect your support workspace.</p>
          </div>
        </div>
      </div>
      <form className="space-y-5 bg-slate-50/60 p-6 sm:p-7" onSubmit={submit}>
        <label className="block">
          <span className="app-label">New password</span>
          <div className={inputGroupClass}>
            <span className={iconSlotClass}>
              <LockKeyhole className="h-4 w-4" />
            </span>
            <input
              type={showPassword ? "text" : "password"}
              className={fieldClass}
              placeholder="Minimum 6 characters"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              minLength={6}
              required
            />
            <button
              type="button"
              className={passwordToggleClass}
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </label>
        <label className="block">
          <span className="app-label">Confirm password</span>
          <div className={inputGroupClass}>
            <span className={iconSlotClass}>
              <LockKeyhole className="h-4 w-4" />
            </span>
            <input
              type={showConfirmPassword ? "text" : "password"}
              className={fieldClass}
              placeholder="Repeat password"
              value={form.confirmPassword}
              onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
              minLength={6}
              required
            />
            <button
              type="button"
              className={passwordToggleClass}
              onClick={() => setShowConfirmPassword((value) => !value)}
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </label>
        {message ? <p className="rounded-md border border-green-100 bg-green-50 p-3 text-sm font-medium text-green-700">{message}</p> : null}
        {error ? <p className="rounded-md border border-red-100 bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p> : null}
        <Button className="min-h-12 w-full rounded-lg" loading={loading}>Reset password</Button>
        <p className="border-t border-slate-200 pt-5 text-sm text-slate-500">
          Need to sign in instead? <Link className="font-semibold text-blue-700" to="/login">Back to login</Link>
        </p>
      </form>
    </Card>
  );
}

