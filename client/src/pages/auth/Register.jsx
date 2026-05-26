import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import Button from "../../components/common/Button.jsx";
import Card from "../../components/common/Card.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "CUSTOMER", language: "en" });

  const submit = async (event) => {
    event.preventDefault();
    await register(form).catch(() => null);
    navigate("/login");
  };

  return (
    <Card className="p-6">
      <h1 className="text-2xl font-bold text-slate-950">Create customer account</h1>
      <p className="mt-1 text-sm text-slate-500">Registration is backend-ready and defaults to customer access.</p>
      <form className="mt-6 space-y-4" onSubmit={submit}>
        {["name", "email", "password"].map((field) => (
          <label className="block" key={field}>
            <span className="text-sm font-semibold capitalize text-slate-700">{field}</span>
            <input type={field === "password" ? "password" : "text"} className="mt-1 h-11 w-full rounded-md border border-slate-200 px-3 outline-none focus:border-sky-500 focus:ring-4 focus:ring-sky-100" value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} required />
          </label>
        ))}
        <Button className="w-full">Register</Button>
      </form>
      <p className="mt-5 text-sm text-slate-500">Already registered? <Link className="font-semibold text-sky-700" to="/login">Sign in</Link></p>
    </Card>
  );
}
