import { Link } from "react-router-dom";
import Button from "../../components/common/Button.jsx";
import Card from "../../components/common/Card.jsx";

export default function ForgotPassword() {
  return (
    <Card className="p-6">
      <h1 className="text-2xl font-bold text-slate-950">Reset password</h1>
      <p className="mt-1 text-sm text-slate-500">Enter your email and the backend email service can send a secure recovery link.</p>
      <form className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">Email</span>
          <input type="email" className="mt-1 h-11 w-full rounded-md border border-slate-200 px-3 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100" placeholder="you@example.com" />
        </label>
        <Button className="w-full">Send reset link</Button>
      </form>
      <Link className="mt-5 inline-block text-sm font-semibold text-sky-700" to="/login">Back to login</Link>
    </Card>
  );
}
