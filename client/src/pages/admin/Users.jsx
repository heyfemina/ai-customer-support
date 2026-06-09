import { useEffect, useState } from "react";
import api from "../../api/axios.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import Table from "../../components/common/Table.jsx";
import Badge from "../../components/common/Badge.jsx";
import Button from "../../components/common/Button.jsx";
import Modal from "../../components/common/Modal.jsx";
import Card from "../../components/common/Card.jsx";
import Pagination from "../../components/common/Pagination.jsx";
import { normalizeItems } from "../../utils/helpers.js";
import { useTranslation } from "react-i18next";

const departments = ["Technical Support", "Billing Support", "Account Support", "General Support", "Complaint Support"];
const categories = ["Technical", "Billing", "Account", "Refund", "General", "Complaint"];
const agentStatuses = ["ONLINE", "BUSY", "AWAY", "OFFLINE"];

export default function Users() {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const emptyForm = { name: "", email: "", password: "", role: "CUSTOMER", language: "en", isActive: true, department: "General Support", categories: ["General"], agentStatus: "ONLINE", maxActiveChats: 3 };
  const [form, setForm] = useState(emptyForm);
  const [filters, setFilters] = useState({ search: "", role: "" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  useEffect(() => {
    setDataLoading(true);
    setError("");
    api.get("/users").then(({ data }) => setItems(normalizeItems(data, []))).catch((error) => {
      setError(error.friendlyMessage || "Unable to load users.");
    }).finally(() => {
      setHasLoadedOnce(true);
      setDataLoading(false);
    });
  }, []);
  const openForm = (user = null) => {
    setEditing(user);
    setForm(user ? { ...emptyForm, ...user, role: user.role === "ADMIN" ? "CUSTOMER" : user.role, password: "" } : emptyForm);
    setError("");
    setModalOpen(true);
  };
  const closeForm = () => {
    setEditing(null);
    setModalOpen(false);
    setForm(emptyForm);
    setError("");
    setLoading(false);
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
    if (payload.role !== "AGENT") {
      payload.department = "General Support";
      payload.categories = ["General"];
      payload.agentStatus = "OFFLINE";
      payload.maxActiveChats = 0;
    }
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
  const pagedItems = filteredItems.slice((page - 1) * pageSize, page * pageSize);
  const columns = [
    { key: "name", label: t("auth.fullName") },
    { key: "email", labelKey: "table.email" },
    { key: "role", labelKey: "table.role", align: "center", render: (row) => <Badge tone={row.role === "ADMIN" ? "violet" : row.role === "AGENT" ? "blue" : "green"}>{row.role}</Badge> },
    { key: "isActive", labelKey: "table.status", align: "center", render: (row) => <Badge tone={row.isActive ? "green" : "red"}>{row.isActive ? t("common.active") : t("common.inactive")}</Badge> },
    { key: "actions", labelKey: "table.action", align: "center", render: (row) => row.role === "ADMIN" ? <span className="text-sm font-semibold text-slate-500">{t("users.seedAdmin", { defaultValue: "Seed admin" })}</span> : <div className="flex items-center justify-center gap-2"><Button variant="secondary" onClick={() => openForm(row)}>{t("users.edit", { defaultValue: "Edit" })}</Button><Button variant={row.isActive ? "danger" : "secondary"} onClick={() => toggleStatus(row)}>{row.isActive ? t("users.deactivate", { defaultValue: "Deactivate" }) : t("users.activate", { defaultValue: "Activate" })}</Button></div> },
  ];
  const activeUsers = items.filter((item) => item.isActive).length;
  return (
    <>
      <PageHeader title={t("pages.users.title")} description={t("pages.users.description")} actions={<Button onClick={() => openForm()}>{t("users.addUser", { defaultValue: "Add user" })}</Button>} />
      {notice ? <p className="mb-4 rounded-md border border-green-100 bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">{notice}</p> : null}
      {error && !modalOpen ? <p className="mb-4 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}
      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4"><p className="text-sm font-semibold text-slate-500">{t("common.totalUsers")}</p><p className="mt-2 text-2xl font-bold text-slate-950">{items.length}</p></Card>
        <Card className="p-4"><p className="text-sm font-semibold text-slate-500">{t("common.activeUsers")}</p><p className="mt-2 text-2xl font-bold text-slate-950">{activeUsers}</p></Card>
        <Card className="p-4"><p className="text-sm font-semibold text-slate-500">{t("nav.agents")}</p><p className="mt-2 text-2xl font-bold text-slate-950">{items.filter((item) => item.role === "AGENT").length}</p></Card>
        <Card className="p-4"><p className="text-sm font-semibold text-slate-500">{t("nav.customers")}</p><p className="mt-2 text-2xl font-bold text-slate-950">{items.filter((item) => item.role === "CUSTOMER").length}</p></Card>
      </div>
      <Card className="mb-4 p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_180px]">
          <input className="app-field" placeholder={t("users.searchUsers", { defaultValue: "Search users" })} value={filters.search} onChange={(event) => { setFilters({ ...filters, search: event.target.value }); setPage(1); }} />
          <select className="app-field" value={filters.role} onChange={(event) => { setFilters({ ...filters, role: event.target.value }); setPage(1); }}>
            <option value="">{t("activity.allRoles", { defaultValue: "All roles" })}</option><option>ADMIN</option><option>AGENT</option><option>CUSTOMER</option>
          </select>
        </div>
      </Card>
      <Table columns={columns} data={pagedItems} paginated={false} />
      <Pagination page={page} pageSize={pageSize} total={filteredItems.length} itemLabel="users" onPageChange={setPage} onPageSizeChange={(value) => { setPageSize(value); setPage(1); }} />
      <Modal
        open={modalOpen}
        title={editing ? t("users.editUser", { defaultValue: "Edit user" }) : form.role === "AGENT" ? t("users.addAgent", { defaultValue: "Add agent" }) : t("users.addCustomer", { defaultValue: "Add customer" })}
        onClose={closeForm}
        footer={<><Button variant="secondary" onClick={closeForm}>{t("common.cancel")}</Button><Button loading={loading} onClick={saveUser}>{editing ? t("users.saveUser", { defaultValue: "Save user" }) : t("users.createUser", { defaultValue: "Create user" })}</Button></>}
      >
        <div className="grid gap-4">
          {error ? <p className="rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{error}</p> : null}
          <label><span className="app-label">{t("auth.fullName")}</span><input className="app-field mt-1" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label><span className="app-label">{t("auth.email")}</span><input className="app-field mt-1" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label>
          <label><span className="app-label">{editing ? t("users.newPassword", { defaultValue: "New password" }) : t("auth.password")}</span><input type="password" className="app-field mt-1" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder={editing ? t("users.keepPassword", { defaultValue: "Leave blank to keep current password" }) : t("auth.minimumPassword")} /></label>
          <label><span className="app-label">{t("table.role")}</span><select className="app-field mt-1" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option>AGENT</option><option>CUSTOMER</option></select></label>
          {form.role === "AGENT" ? (
            <>
              <label><span className="app-label">{t("users.department", { defaultValue: "Department" })}</span><select className="app-field mt-1" value={form.department || "General Support"} onChange={(event) => setForm({ ...form, department: event.target.value })}>{departments.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label><span className="app-label">{t("users.skills", { defaultValue: "Skills / Categories" })}</span><select multiple className="app-field mt-1 min-h-28" value={form.categories || ["General"]} onChange={(event) => setForm({ ...form, categories: Array.from(event.target.selectedOptions).map((option) => option.value) })}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label><span className="app-label">{t("users.agentStatus", { defaultValue: "Agent Status" })}</span><select className="app-field mt-1" value={form.agentStatus || "ONLINE"} onChange={(event) => setForm({ ...form, agentStatus: event.target.value })}>{agentStatuses.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label><span className="app-label">{t("users.maxActiveChats", { defaultValue: "Max active chats" })}</span><input type="number" min="1" max="20" className="app-field mt-1" value={form.maxActiveChats || 3} onChange={(event) => setForm({ ...form, maxActiveChats: Number(event.target.value) })} /></label>
            </>
          ) : null}
          <label><span className="app-label">{t("language")}</span><select className="app-field mt-1" value={form.language || "en"} onChange={(event) => setForm({ ...form, language: event.target.value })}><option value="en">English</option><option value="it">Italian</option><option value="es">Spanish</option><option value="fr">French</option></select></label>
        </div>
      </Modal>
    </>
  );
}
