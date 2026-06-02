import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader.jsx";
import Card from "../../components/common/Card.jsx";
import Button from "../../components/common/Button.jsx";
import api, { uploadFile } from "../../api/axios.js";

export default function CreateTicket() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ subject: "", description: "", category: "General", priority: "MEDIUM" });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    if (form.subject.trim().length < 5) {
      setError("Please enter a clear subject with at least 5 characters.");
      return;
    }
    if (form.description.trim().length < 15) {
      setError("Please add a little more detail so support can help properly.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const attachments = file ? [await uploadFile(file)] : [];
      await api.post("/tickets", { ...form, attachments });
      navigate("/customer/tickets");
    } catch (error) {
      setError(error.friendlyMessage || "Ticket was not created. Please check the API connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader title="Create ticket" description="Submit a support request with priority, category, and optional files or images." />
      <Card className="p-5">
        {error ? <p className="mb-4 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}
        <form className="grid gap-5 lg:grid-cols-2" onSubmit={submit}>
          <label className="block lg:col-span-2"><span className="app-label">Subject</span><input required className="app-field mt-1" value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} /></label>
          <label className="block"><span className="app-label">Category</span><select className="app-field mt-1" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}><option>Technical</option><option>Billing</option><option>Account</option><option>Refund</option><option>General</option><option>Complaint</option></select></label>
          <label className="block"><span className="app-label">Priority</span><select className="app-field mt-1" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>URGENT</option></select></label>
          <label className="block lg:col-span-2"><span className="app-label">Description</span><textarea required className="app-field mt-1 min-h-40" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
          <label className="block lg:col-span-2"><span className="app-label">Upload file or image</span><input type="file" className="mt-1 w-full rounded-md border border-dashed border-slate-300 bg-slate-50 p-4 text-sm" onChange={(event) => setFile(event.target.files?.[0] || null)} />{file ? <span className="mt-2 block text-sm font-semibold text-slate-500">Selected: {file.name}</span> : null}</label>
          <div className="lg:col-span-2"><Button loading={loading}>Create support ticket</Button></div>
        </form>
      </Card>
    </>
  );
}
