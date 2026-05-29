import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import Button from "../../components/common/Button.jsx";
import Card from "../../components/common/Card.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", language: "en" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(form);
      navigate("/login", { state: { registered: true } });
    } catch (error) {
      setError(error.friendlyMessage || "Registration failed. Please check your details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-6 sm:p-7">
      <h1 className="text-2xl font-bold text-slate-950">Register</h1>
      <p className="mt-1 text-sm text-slate-500">This creates a real customer account in the database. Admin and agent accounts are created by an admin.</p>
      <form className="mt-6 space-y-4" onSubmit={submit}>
        {error ? <p className="rounded-md bg-rose-50 p-3 text-sm font-medium text-rose-700">{error}</p> : null}
        {["name", "email", "password"].map((field) => (
          <label className="block" key={field}>
            <span className="text-sm font-semibold capitalize text-slate-700">{field}</span>
            <input type={field === "password" ? "password" : "text"} className="mt-1 h-11 w-full rounded-md border border-slate-200 px-3 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100" value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} required />
          </label>
        ))}
        <label className="block">
          <span className="text-sm font-semibold text-slate-700">Language</span>
          <select className="mt-1 h-11 w-full rounded-md border border-slate-200 px-3 outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100" value={form.language} onChange={(event) => setForm({ ...form, language: event.target.value })}>
            <option value="en">English</option>
            <option value="it">Italian</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
          </select>
        </label>
        <Button className="w-full" loading={loading}>Create customer account</Button>
      </form>
      <p className="mt-5 text-sm text-slate-500">Already registered? <Link className="font-semibold text-teal-700" to="/login">Sign in</Link></p>
    </Card>
  );
}
