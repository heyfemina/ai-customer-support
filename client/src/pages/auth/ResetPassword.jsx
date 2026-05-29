import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Button from "../../components/common/Button.jsx";
import Card from "../../components/common/Card.jsx";
import api from "../../api/axios.js";

export default function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

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
    <Card className="p-6 sm:p-7">
      <h1 className="text-2xl font-bold text-slate-950">Set new password</h1>
      <p className="mt-1 text-sm text-slate-500">Choose a new password for your account.</p>
      <form className="mt-6 space-y-4" onSubmit={submit}>
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">New password</span>
          <input type="password" className="mt-1 h-11 w-full rounded-md border border-slate-200 px-3 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} minLength={6} required />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">Confirm password</span>
          <input type="password" className="mt-1 h-11 w-full rounded-md border border-slate-200 px-3 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100" value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} minLength={6} required />
        </label>
        {message ? <p className="rounded-md bg-emerald-50 p-3 text-sm font-medium text-emerald-700">{message}</p> : null}
        {error ? <p className="rounded-md bg-rose-50 p-3 text-sm font-medium text-rose-700">{error}</p> : null}
        <Button className="w-full" loading={loading}>Reset password</Button>
      </form>
      <Link className="mt-5 inline-block text-sm font-semibold text-teal-700" to="/login">Back to login</Link>
    </Card>
  );
}
