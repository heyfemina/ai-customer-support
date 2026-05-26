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

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    try {
      const attachments = file ? [await uploadFile(file)] : [];
      await api.post("/tickets", { ...form, attachments });
      navigate("/customer/tickets");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <PageHeader title="Create ticket" description="Submit a support request with priority, category, and optional files or images." />
      <Card className="p-5">
        <form className="grid gap-5 lg:grid-cols-2" onSubmit={submit}>
          <label className="block lg:col-span-2"><span className="text-sm font-semibold">Subject</span><input required className="mt-1 h-11 w-full rounded-md border border-slate-200 px-3" value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} /></label>
          <label className="block"><span className="text-sm font-semibold">Category</span><select className="mt-1 h-11 w-full rounded-md border border-slate-200 px-3" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}><option>General</option><option>Billing</option><option>Technical</option><option>AI</option><option>Compliance</option></select></label>
          <label className="block"><span className="text-sm font-semibold">Priority</span><select className="mt-1 h-11 w-full rounded-md border border-slate-200 px-3" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>URGENT</option></select></label>
          <label className="block lg:col-span-2"><span className="text-sm font-semibold">Description</span><textarea required className="mt-1 min-h-40 w-full rounded-md border border-slate-200 p-3" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
          <label className="block lg:col-span-2"><span className="text-sm font-semibold">Upload file or image</span><input type="file" className="mt-1 w-full rounded-md border border-dashed border-slate-300 p-4" onChange={(event) => setFile(event.target.files?.[0] || null)} /></label>
          <div className="lg:col-span-2"><Button loading={loading}>Create support ticket</Button></div>
        </form>
      </Card>
    </>
  );
}
