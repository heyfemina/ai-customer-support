import { X } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader.jsx";
import Card from "../../components/common/Card.jsx";
import Button from "../../components/common/Button.jsx";
import api from "../../api/axios.js";

const allowedTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);
const maxFileSize = 10 * 1024 * 1024;

function validateFiles(files) {
  for (const file of files) {
    if (!allowedTypes.has(file.type)) return `${file.name} is not an allowed file type.`;
    if (file.size > maxFileSize) return `${file.name} is larger than 10MB.`;
  }
  return "";
}

function fileSize(value) {
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CreateTicket() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ subject: "", description: "", category: "General", priority: "MEDIUM" });
  const [files, setFiles] = useState([]);
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
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => payload.append(key, value));
      files.forEach((file) => payload.append("attachments", file));
      await api.post("/tickets", payload, { headers: { "Content-Type": "multipart/form-data" } });
      navigate("/customer/tickets");
    } catch (error) {
      setError(error.friendlyMessage || "Ticket was not created. Please check the API connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const chooseFiles = (event) => {
    const selected = Array.from(event.target.files || []);
    const validationError = validateFiles(selected);
    if (validationError) {
      setError(validationError);
      event.target.value = "";
      setFiles([]);
      return;
    }
    setError("");
    setFiles(selected);
  };

  return (
    <>
      <PageHeader title="Create ticket" description="Submit a support request with priority, category, and optional files or images." />
      <Card className="p-6">
        {error ? <p className="mb-4 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}
        <form className="grid gap-5 lg:grid-cols-2" onSubmit={submit}>
          <label className="block lg:col-span-2"><span className="app-label">Subject</span><input required className="app-field mt-1" value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} /></label>
          <label className="block"><span className="app-label">Category</span><select className="app-field mt-1" value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}><option>Technical</option><option>Billing</option><option>Account</option><option>Refund</option><option>General</option><option>Complaint</option></select></label>
          <label className="block"><span className="app-label">Priority</span><select className="app-field mt-1" value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}><option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>URGENT</option></select></label>
          <label className="block lg:col-span-2"><span className="app-label">Description</span><textarea required className="app-field mt-1 min-h-40" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label>
          <label className="block lg:col-span-2">
            <span className="app-label">Upload files or images</span>
            <input type="file" multiple accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx" className="app-upload mt-1" onChange={chooseFiles} />
            {files.length ? (
              <div className="mt-3 grid gap-2">
                {files.map((item) => (
                  <div key={`${item.name}-${item.size}`} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-800">{item.name}</p>
                      <p className="text-xs text-slate-500">{fileSize(item.size)}</p>
                    </div>
                    <button type="button" className="grid h-8 w-8 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900" onClick={() => setFiles((current) => current.filter((file) => file !== item))} aria-label={`Remove ${item.name}`}>
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </label>
          <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-5 lg:col-span-2"><Button variant="secondary" type="button" onClick={() => navigate("/customer/tickets")}>Cancel</Button><Button loading={loading}>Create support ticket</Button></div>
        </form>
      </Card>
    </>
  );
}
