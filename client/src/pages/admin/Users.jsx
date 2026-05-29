import { useEffect, useState } from "react";
import api from "../../api/axios.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import Table from "../../components/common/Table.jsx";
import Badge from "../../components/common/Badge.jsx";
import Button from "../../components/common/Button.jsx";
import Modal from "../../components/common/Modal.jsx";
import { normalizeItems } from "../../utils/helpers.js";

export default function Users() {
  const [items, setItems] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const emptyForm = { name: "", email: "", password: "", role: "CUSTOMER", language: "en", isActive: true };
  const [form, setForm] = useState(emptyForm);
  const [filters, setFilters] = useState({ search: "", role: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    api.get("/users").then(({ data }) => setItems(normalizeItems(data, []))).catch((error) => {
      setError(error.friendlyMessage || "Unable to load users.");
    });
  }, []);
  const openForm = (user = null) => {
    setEditing(user);
    setForm(user ? { ...emptyForm, ...user, password: "" } : emptyForm);
    setError("");
    setModalOpen(true);
  };
  const saveUser = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      setError("Name and email are required.");
      return;
    }
    const duplicate = items.some((item) => item.email.toLowerCase() === form.email.toLowerCase() && item.id !== editing?.id);
    if (duplicate) {
      setError("A user with this email already exists.");
      return;
    }
    if (!editing && form.password.trim().length < 6) {
      setError("Password must be at least 6 characters for a new user.");
      return;
    }
    const { id, createdAt, updatedAt, ...payload } = form;
    if (editing && !payload.password) delete payload.password;
    setLoading(true);
    try {
      const { data } = editing ? await api.put(`/users/${editing.id}`, payload) : await api.post("/users", payload);
      const saved = data.data || data;
      setItems((current) => editing ? current.map((item) => item.id === editing.id ? saved : item) : [saved, ...current]);
      setNotice(editing ? "User updated" : "User created");
      setEditing(null);
      setModalOpen(false);
      setForm(emptyForm);
    } catch (error) {
      setError(error.friendlyMessage || "Unable to save user.");
    } finally {
      setLoading(false);
    }
  };
  const toggleStatus = async (user) => {
    const nextStatus = !user.isActive;
    setError("");
    try {
      const { data } = await api.put(`/users/${user.id}`, { isActive: nextStatus });
      const saved = data.data || data;
      setItems((current) => current.map((item) => item.id === user.id ? saved : item));
      setNotice(`${user.name} ${user.isActive ? "deactivated" : "activated"}`);
    } catch (error) {
      setError(error.friendlyMessage || "Unable to update user status.");
    }
  };
  const filteredItems = items.filter((user) => {
    const search = filters.search.toLowerCase();
    const matchesSearch = !search || `${user.name} ${user.email}`.toLowerCase().includes(search);
    const matchesRole = !filters.role || user.role === filters.role;
    return matchesSearch && matchesRole;
  });
  const columns = [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "role", label: "Role", render: (row) => <Badge tone={row.role === "ADMIN" ? "violet" : row.role === "AGENT" ? "blue" : "green"}>{row.role}</Badge> },
    { key: "isActive", label: "Status", render: (row) => <Badge tone={row.isActive ? "green" : "red"}>{row.isActive ? "Active" : "Inactive"}</Badge> },
    { key: "actions", label: "Actions", render: (row) => <div className="flex gap-2"><Button variant="secondary" onClick={() => openForm(row)}>Edit</Button><Button variant={row.isActive ? "danger" : "secondary"} onClick={() => toggleStatus(row)}>{row.isActive ? "Deactivate" : "Activate"}</Button></div> },
  ];
  return (
    <>
      <PageHeader title="User management" description="Create, edit, deactivate, and audit platform users." actions={<Button onClick={() => openForm()}>Add user</Button>} />
      {notice ? <p className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{notice}</p> : null}
      {error && !modalOpen ? <p className="mb-4 rounded-md bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p> : null}
      <div className="mb-4 grid gap-3 md:grid-cols-[1fr_180px]">
        <input className="h-11 rounded-md border border-slate-200 px-3 text-sm" placeholder="Search users" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} />
        <select className="h-11 rounded-md border border-slate-200 px-3 text-sm" value={filters.role} onChange={(event) => setFilters({ ...filters, role: event.target.value })}>
          <option value="">All roles</option><option>ADMIN</option><option>AGENT</option><option>CUSTOMER</option>
        </select>
      </div>
      <Table columns={columns} data={filteredItems} />
      <Modal
        open={modalOpen}
        title={editing ? "Edit user" : "Add user"}
        onClose={() => {
          setEditing(null);
          setModalOpen(false);
          setForm(emptyForm);
          setError("");
        }}
        footer={<><Button variant="secondary" onClick={() => setForm(emptyForm)}>Reset</Button><Button loading={loading} onClick={saveUser}>Save user</Button></>}
      >
        <div className="grid gap-4">
          {error ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p> : null}
          <label><span className="text-sm font-semibold text-slate-700">Name</span><input className="mt-1 h-11 w-full rounded-md border border-slate-200 px-3" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label><span className="text-sm font-semibold text-slate-700">Email</span><input className="mt-1 h-11 w-full rounded-md border border-slate-200 px-3" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
          <label><span className="text-sm font-semibold text-slate-700">{editing ? "New password" : "Password"}</span><input type="password" className="mt-1 h-11 w-full rounded-md border border-slate-200 px-3" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder={editing ? "Leave blank to keep current password" : "Minimum 6 characters"} /></label>
          <label><span className="text-sm font-semibold text-slate-700">Role</span><select className="mt-1 h-11 w-full rounded-md border border-slate-200 px-3" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option>ADMIN</option><option>AGENT</option><option>CUSTOMER</option></select></label>
          <label><span className="text-sm font-semibold text-slate-700">Language</span><select className="mt-1 h-11 w-full rounded-md border border-slate-200 px-3" value={form.language || "en"} onChange={(event) => setForm({ ...form, language: event.target.value })}><option value="en">English</option><option value="it">Italian</option><option value="es">Spanish</option><option value="fr">French</option></select></label>
        </div>
      </Modal>
    </>
  );
}
