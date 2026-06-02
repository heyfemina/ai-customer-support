import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { ShieldCheck } from "lucide-react";
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
    <Card className="w-full overflow-hidden border-slate-200 shadow-xl shadow-slate-200/70">
      <div className="border-b border-slate-200 bg-white px-6 py-6 sm:px-7">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-blue-700">Two-factor security</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-950">Verify OTP</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">Enter the one-time code for {location.state?.email || "your account"}.</p>
          </div>
        </div>
      </div>
      <form className="space-y-5 bg-slate-50/60 p-6 sm:p-7" onSubmit={submit}>
        <label className="block">
          <span className="app-label">Verification code</span>
          <input
            className="app-field mt-1.5 min-h-12 rounded-lg text-center text-lg font-bold tracking-[0.3em]"
            value={otp}
            onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            maxLength={6}
          />
        </label>
        {notice ? <p className="rounded-md border border-green-100 bg-green-50 p-3 text-sm font-medium text-green-700">{notice}</p> : null}
        {error ? <p className="rounded-md border border-red-100 bg-red-50 p-3 text-sm font-medium text-red-700">{error}</p> : null}
        <Button className="min-h-12 w-full rounded-lg" loading={loading}>Verify and sign in</Button>
        <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 text-sm sm:flex-row sm:items-center sm:justify-between">
          <button className="text-left font-semibold text-blue-700 disabled:opacity-60" type="button" onClick={resend} disabled={resending}>{resending ? "Sending..." : "Resend OTP"}</button>
          <Link className="font-semibold text-slate-500" to="/login">Back to login</Link>
        </div>
      </form>
    </Card>
  );
}
