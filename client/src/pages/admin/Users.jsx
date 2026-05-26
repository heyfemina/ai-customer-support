import { useEffect, useState } from "react";
import api from "../../api/axios.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import Table from "../../components/common/Table.jsx";
import Badge from "../../components/common/Badge.jsx";
import Button from "../../components/common/Button.jsx";
import { users } from "../../utils/dummyData.js";
import { normalizeItems } from "../../utils/helpers.js";

export default function Users() {
  const [items, setItems] = useState(users);
  useEffect(() => {
    api.get("/users").then(({ data }) => setItems(normalizeItems(data, users))).catch(() => setItems(users));
  }, []);
  const columns = [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "role", label: "Role", render: (row) => <Badge tone={row.role === "ADMIN" ? "violet" : row.role === "AGENT" ? "blue" : "green"}>{row.role}</Badge> },
    { key: "isActive", label: "Status", render: (row) => <Badge tone={row.isActive ? "green" : "red"}>{row.isActive ? "Active" : "Inactive"}</Badge> },
  ];
  return <><PageHeader title="User management" description="Create, edit, deactivate, and audit platform users." actions={<Button>Add user</Button>} /><Table columns={columns} data={items} /></>;
}
