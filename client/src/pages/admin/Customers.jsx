import { useEffect, useState } from "react";
import api from "../../api/axios.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import Table from "../../components/common/Table.jsx";
import Badge from "../../components/common/Badge.jsx";
import { users } from "../../utils/dummyData.js";
import { normalizeItems } from "../../utils/helpers.js";

export default function Customers() {
  const [customers, setCustomers] = useState(users.filter((user) => user.role === "CUSTOMER"));
  useEffect(() => {
    api.get("/reports/customers").then(({ data }) => setCustomers(normalizeItems(data, customers))).catch(() => null);
  }, []);
  const columns = [
    { key: "name", label: "Customer" },
    { key: "email", label: "Email" },
    { key: "tickets", label: "Tickets", render: (row) => row.ticketCount ?? row.tickets?.length ?? 0 },
    { key: "activeChats", label: "Active chats", render: (row) => row.activeChats ?? 0 },
    { key: "plan", label: "Plan", render: () => <Badge tone="blue">Business</Badge> },
  ];
  return <><PageHeader title="Customer management" description="View customer profiles, support history, and account health." /><Table columns={columns} data={customers} /></>;
}
