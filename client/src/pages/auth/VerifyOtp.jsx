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
  const [loading, setLoading] = useState(false);
  const tempLoginToken = location.state?.tempLoginToken;

  if (!tempLoginToken) return <Navigate to="/login" replace />;

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const { data } = await api.post("/auth/verify-2fa", { tempLoginToken, otp });
      const user = complete2FA({ authToken: data.data.token, authUser: data.data.user });
      navigate(roleHome[user.role] || "/dashboard", { replace: true });
    } catch (error) {
      setError(error.friendlyMessage || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    const { data } = await api.post("/auth/resend-2fa", { tempLoginToken });
    if (data.data?.devOtp) setOtp(data.data.devOtp);
  };

  return (
    <Card className="p-6">
      <h1 className="text-2xl font-bold text-slate-950">Verify OTP</h1>
      <p className="mt-1 text-sm text-slate-500">Enter the one-time code for {location.state?.email || "your account"}.</p>
      <form className="mt-6 space-y-4" onSubmit={submit}>
        <input className="h-11 w-full rounded-md border border-slate-200 px-3 text-center text-lg font-bold tracking-[0.3em]" value={otp} onChange={(event) => setOtp(event.target.value)} maxLength={6} />
        {error ? <p className="rounded-md bg-rose-50 p-3 text-sm font-medium text-rose-700">{error}</p> : null}
        <Button className="w-full" loading={loading}>Verify and sign in</Button>
      </form>
      <button className="mt-4 text-sm font-semibold text-sky-700" onClick={resend}>Resend OTP</button>
      <Link className="ml-4 text-sm font-semibold text-slate-500" to="/login">Back to login</Link>
    </Card>
  );
}
