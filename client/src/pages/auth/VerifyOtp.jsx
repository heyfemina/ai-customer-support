import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import api from "../../api/axios.js";
import Button from "../../components/common/Button.jsx";
import Card from "../../components/common/Card.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { roleHome } from "../../utils/constants.js";

export default function VerifyOtp() {
  const location = useLocation();
  const navigate = useNavigate();
  const { complete2FA } = useAuth();
  const [otp, setOtp] = useState(location.state?.devOtp || "");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const tempLoginToken = location.state?.tempLoginToken;

  if (!tempLoginToken) return <Navigate to="/login" replace />;

  const submit = async (event) => {
    event.preventDefault();
    if (otp.trim().length !== 6) {
      setError("Enter the 6-digit verification code.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/auth/verify-2fa", { tempLoginToken, otp });
      const payload = data.data || data;
      const user = complete2FA({ authToken: payload.token, authUser: payload.user });
      const role = String(user.role || "").toUpperCase();
      navigate(roleHome[role] || "/dashboard", { replace: true });
    } catch (error) {
      setError(error.friendlyMessage || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setResending(true);
    setError("");
    setNotice("");
    try {
      const { data } = await api.post("/auth/resend-2fa", { tempLoginToken });
      const payload = data.data || data;
      if (payload?.devOtp) setOtp(payload.devOtp);
      setNotice("A new code was sent to your email.");
    } catch (error) {
      setError(error.friendlyMessage || "Unable to resend verification code.");
    } finally {
      setResending(false);
    }
  };

  return (
    <Card className="p-6 sm:p-7">
      <h1 className="text-2xl font-bold text-slate-950">Verify OTP</h1>
      <p className="mt-1 text-sm text-slate-500">Enter the one-time code for {location.state?.email || "your account"}.</p>
      <form className="mt-6 space-y-4" onSubmit={submit}>
        <input className="app-field text-center text-lg font-bold tracking-[0.3em]" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" maxLength={6} />
        {notice ? <p className="rounded-md border border-green-100 bg-green-50 p-3 text-sm font-medium text-green-700">{notice}</p> : null}
        {error ? <p className="rounded-md border border-red-100 bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p> : null}
        <Button className="w-full" loading={loading}>Verify and sign in</Button>
      </form>
      <button className="mt-4 text-sm font-semibold text-blue-700 disabled:opacity-60" onClick={resend} disabled={resending}>{resending ? "Sending..." : "Resend OTP"}</button>
      <Link className="ml-4 text-sm font-semibold text-slate-500" to="/login">Back to login</Link>
    </Card>
  );
}
