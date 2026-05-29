import { Link } from "react-router-dom";
import { useState } from "react";
import Button from "../../components/common/Button.jsx";
import Card from "../../components/common/Card.jsx";
import api from "../../api/axios.js";

export default function ForgotPassword() {
  const [email, setEmail] = useState("mathilde8@ethereal.email");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setPreviewUrl("");
    setError("");

    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      setMessage(data.message || "Password reset link sent");
      setPreviewUrl(data.data?.previewUrl || "");
    } catch (err) {
      setError(err.friendlyMessage || "Could not send reset link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 sm:p-7">
      <h1 className="text-2xl font-bold text-slate-950">Reset password</h1>
      <p className="mt-1 text-sm text-slate-500">Enter your email and we will send a secure recovery link.</p>
      <form className="mt-6 space-y-4" onSubmit={submit}>
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">Email</span>
          <input type="email" className="mt-1 h-11 w-full rounded-md border border-slate-200 px-3 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </label>
        {message ? <p className="rounded-md bg-emerald-50 p-3 text-sm font-medium text-emerald-700">{message}</p> : null}
        {previewUrl ? (
          <a className="block rounded-md bg-teal-50 p-3 text-sm font-semibold text-teal-700" href={previewUrl} target="_blank" rel="noreferrer">
            Open Ethereal message
          </a>
        ) : null}
        {error ? <p className="rounded-md bg-rose-50 p-3 text-sm font-medium text-rose-700">{error}</p> : null}
        <Button className="w-full" loading={loading}>Send reset link</Button>
      </form>
      <Link className="mt-5 inline-block text-sm font-semibold text-teal-700" to="/login">Back to login</Link>
    </Card>
  );
}
