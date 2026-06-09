import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import api from "../../api/axios.js";
import Button from "../../components/common/Button.jsx";
import Card from "../../components/common/Card.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { getDashboardPath } from "../../utils/constants.js";
import { useTranslation } from "react-i18next";

export default function VerifyOtp() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { complete2FA } = useAuth();
  const [otp, setOtp] = useState(location.state?.devOtp || "");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const tempLoginToken = location.state?.tempLoginToken;
  const expectedRole = location.state?.expectedRole;

  if (!tempLoginToken) return <Navigate to="/login" replace />;

  const submit = async (event) => {
    event.preventDefault();
    if (otp.trim().length !== 6) {
      setError(t("auth.otpLength"));
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/auth/verify-2fa", { tempLoginToken, otp });
      const payload = data.data || data;
      const user = complete2FA({ authToken: payload.token, authUser: payload.user, expectedRole });
      navigate(getDashboardPath(user.role), { replace: true });
    } catch (error) {
      setError(error.friendlyMessage || t("auth.invalidOtp"));
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
      setNotice(t("auth.newCodeSent"));
    } catch (error) {
      setError(error.friendlyMessage || t("auth.resendFailed"));
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
            <p className="text-xs font-bold uppercase tracking-wide text-blue-700">{t("auth.twoFactor")}</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-950">{t("auth.verifyOtp")}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">{t("auth.otpHelp", { email: location.state?.email || t("auth.yourAccount") })}</p>
          </div>
        </div>
      </div>
      <form className="space-y-5 bg-slate-50/60 p-6 sm:p-7" onSubmit={submit}>
        <label className="block">
          <span className="app-label">{t("auth.verificationCode")}</span>
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
        <Button className="min-h-12 w-full rounded-lg" loading={loading}>{t("auth.verifyAndSignIn")}</Button>
        <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 text-sm sm:flex-row sm:items-center sm:justify-between">
          <Button size="sm" variant="secondary" type="button" onClick={resend} loading={resending}>{t("auth.resendOtp")}</Button>
          <Link className="font-semibold text-slate-500" to="/login">{t("auth.backToLogin")}</Link>
        </div>
      </form>
    </Card>
  );
}
