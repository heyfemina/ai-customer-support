import { useEffect, useState } from "react";
import api from "../../api/axios.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import Table from "../../components/common/Table.jsx";
import Badge from "../../components/common/Badge.jsx";
import Button from "../../components/common/Button.jsx";
import Modal from "../../components/common/Modal.jsx";
import { users } from "../../utils/dummyData.js";
import { normalizeItems } from "../../utils/helpers.js";
import { demoStore } from "../../utils/demoStore.js";

export default function Users() {
  const [items, setItems] = useState(users);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", role: "CUSTOMER", isActive: true });
  const [filters, setFilters] = useState({ search: "", role: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => {
    api.get("/users").then(({ data }) => setItems(normalizeItems(data, users))).catch(() => setItems(demoStore.users()));
  }, []);
  const openForm = (user = null) => {
    setEditing(user);
    setForm(user || { name: "", email: "", role: "CUSTOMER", isActive: true });
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
    const payload = { ...form, id: editing?.id || `u-${Date.now()}` };
    const next = editing ? items.map((item) => item.id === editing.id ? payload : item) : [payload, ...items];
    try {
      if (editing) await api.put(`/users/${editing.id}`, payload);
      else await api.post("/users", payload);
    } catch {
      demoStore.saveUsers(next);
    }
    setItems(next);
    setNotice(editing ? "User updated" : "User created");
    setEditing(null);
    setModalOpen(false);
    setForm({ name: "", email: "", role: "CUSTOMER", isActive: true });
  };
  const toggleStatus = (user) => {
    const next = items.map((item) => item.id === user.id ? { ...item, isActive: !item.isActive } : item);
    setItems(demoStore.saveUsers(next));
    setNotice(`${user.name} ${user.isActive ? "deactivated" : "activated"}`);
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
          setForm({ name: "", email: "", role: "CUSTOMER", isActive: true });
          setError("");
        }}
        footer={<><Button variant="secondary" onClick={() => setForm({ name: "", email: "", role: "CUSTOMER", isActive: true })}>Reset</Button><Button onClick={saveUser}>Save user</Button></>}
      >
        <div className="grid gap-4">
          {error ? <p className="rounded-md bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{error}</p> : null}
          <label><span className="text-sm font-semibold text-slate-700">Name</span><input className="mt-1 h-11 w-full rounded-md border border-slate-200 px-3" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label><span className="text-sm font-semibold text-slate-700">Email</span><input className="mt-1 h-11 w-full rounded-md border border-slate-200 px-3" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
          <label><span className="text-sm font-semibold text-slate-700">Role</span><select className="mt-1 h-11 w-full rounded-md border border-slate-200 px-3" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option>ADMIN</option><option>AGENT</option><option>CUSTOMER</option></select></label>
        </div>
      </Modal>
    </>
  );
}
