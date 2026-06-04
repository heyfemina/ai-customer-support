import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTranslation } from "react-i18next";
import api from "../../api/axios.js";
import Card from "../../components/common/Card.jsx";
import Badge from "../../components/common/Badge.jsx";
import Button from "../../components/common/Button.jsx";
import PageHeader from "../../components/common/PageHeader.jsx";
import Table from "../../components/common/Table.jsx";
import { formatDate, normalizeItems, unwrapData } from "../../utils/helpers.js";
import { downloadReport } from "../../utils/downloadReport.js";

export default function Analytics() {
  const { t } = useTranslation();
  const [ticketReport, setTicketReport] = useState(null);
  const [responseTimes, setResponseTimes] = useState([]);
  const [sla, setSla] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [agents, setAgents] = useState([]);
  const [chats, setChats] = useState([]);
  const [exporting, setExporting] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    api.get("/reports/tickets").then(({ data }) => setTicketReport(unwrapData(data))).catch(() => {
      setTicketReport(null);
    });
    api.get("/reports/response-time").then(({ data }) => setResponseTimes(unwrapData(data, []))).catch(() => setResponseTimes([]));
    api.get("/reports/sla").then(({ data }) => setSla(unwrapData(data))).catch(() => setSla(null));
    api.get("/reports/customers").then(({ data }) => setCustomers(normalizeItems(data, []))).catch(() => setCustomers([]));
    api.get("/reports/agents").then(({ data }) => setAgents(normalizeItems(data, []))).catch(() => setAgents([]));
    api.get("/chats").then(({ data }) => setChats(normalizeItems(data, []))).catch(() => setChats([]));
  }, []);

  const chartData = ticketReport?.monthlyTickets || [];
  const responseData = responseTimes || [];
  const statusCounts = (ticketReport?.status || []).map((item) => ({ status: item.name, count: item.value }));
  const priorityCounts = (ticketReport?.priority || []).map((item) => ({ priority: item.name, count: item.value }));
  const complaints = (ticketReport?.priority || [])
    .filter((item) => ["HIGH", "URGENT"].includes(item.name))
    .reduce((total, item) => total + Number(item.value || 0), 0);
  const customerSegments = customers.map((customer) => ({
    segment: customer.name,
    tickets: customer.ticketCount || 0,
    activeChats: customer.activeChats || 0,
  }));
  const agentPerformance = agents.map((agent) => ({
    name: agent.name,
    resolved: agent.resolvedTickets || 0,
    activeChats: agent.activeChats || 0,
    rating: Number(agent.rating) || 0,
  }));
  const liveChatStats = [
    { labelKey: "reports.summary.activeChats", value: chats.filter((chat) => ["ASSIGNED", "ACTIVE", "WAITING", "TRANSFERRED"].includes(chat.status)).length },
    { labelKey: "reports.summary.ratedChats", value: chats.filter((chat) => chat.rating).length },
    { labelKey: "reports.summary.aiTransfers", value: chats.filter((chat) => chat.status === "TRANSFERRED").length },
  ];
  const summary = [
    { label: t("reports.summary.openComplaints"), value: complaints },
    { label: t("reports.summary.avgResponse"), value: `${responseData.at(-1)?.minutes || 0}m` },
    { label: t("reports.summary.resolvedThisMonth"), value: chartData.at(-1)?.resolved || 0 },
    { label: t("reports.summary.newTicketsThisMonth"), value: chartData.at(-1)?.tickets || 0 },
    { label: "SLA breached", value: sla?.breached ?? 0 },
    { label: "Avg first response", value: `${sla?.averageFirstResponseMinutes ?? 0}m` },
    { label: "Avg resolution", value: `${sla?.averageResolutionMinutes ?? 0}m` },
  ];
  const slaColumns = [
    { key: "id", label: "Ticket ID", render: (ticket) => <span className="font-mono text-xs font-semibold text-slate-600">{ticket.id?.slice(0, 8)}</span> },
    { key: "customer", label: "Customer", render: (ticket) => <span className="block max-w-40 truncate font-semibold text-slate-800">{ticket.customer?.name || "Customer"}</span> },
    { key: "agent", label: "Agent", render: (ticket) => <span className="block max-w-40 truncate font-semibold text-slate-800">{ticket.agent?.name || "Unassigned"}</span> },
    { key: "category", label: "Category", align: "center", render: (ticket) => ticket.category || "General" },
    { key: "priority", label: "Priority", align: "center", render: (ticket) => <Badge tone={["HIGH", "URGENT"].includes(ticket.priority) ? "red" : "slate"}>{ticket.priority}</Badge> },
    { key: "status", label: "Status", align: "center", render: (ticket) => <Badge tone={ticket.status === "RESOLVED" || ticket.status === "CLOSED" ? "green" : "blue"}>{ticket.status}</Badge> },
    { key: "firstResponseMinutes", label: "First Response", align: "center", render: (ticket) => ticket.firstResponseMinutes !== null ? `${ticket.firstResponseMinutes}m` : "Pending" },
    { key: "resolutionMinutes", label: "Resolution", align: "center", render: (ticket) => ticket.resolutionMinutes !== null ? `${ticket.resolutionMinutes}m` : "Pending" },
    { key: "slaTarget", label: "SLA Target", align: "center", render: () => "24h" },
    { key: "sla", label: "SLA Status", align: "center", render: (ticket) => <Badge tone={ticket.slaBreached ? "red" : ticket.resolutionMinutes === null ? "amber" : "green"}>{ticket.slaBreached ? "Breached" : ticket.resolutionMinutes === null ? "Pending" : "Within SLA"}</Badge> },
    { key: "createdAt", label: "Created At", align: "center", render: (ticket) => formatDate(ticket.createdAt) },
  ];
  const runExport = async (key, path, fileName) => {
    setExporting(key);
    setNotice("");
    try {
      await downloadReport(path, fileName);
      setNotice(`${fileName} downloaded.`);
    } catch {
      setNotice("Unable to download report. Please try again.");
    } finally {
      setExporting("");
    }
  };

  return (
    <>
      <PageHeader
        title={t("reports.title")}
        description={t("reports.description")}
        actions={<div className="flex flex-wrap gap-2"><Button variant="secondary" loading={exporting === "tickets"} onClick={() => runExport("tickets", "/reports/export/tickets?format=csv", "tickets-report.csv")}>Tickets CSV</Button><Button variant="secondary" loading={exporting === "agents"} onClick={() => runExport("agents", "/reports/export/agents?format=csv", "agents-report.csv")}>Agents CSV</Button><Button variant="secondary" loading={exporting === "customers"} onClick={() => runExport("customers", "/reports/export/customers?format=csv", "customers-report.csv")}>Customers CSV</Button></div>}
      />
      {notice ? <p className="mb-4 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm">{notice}</p> : null}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map((item) => (
          <Card key={item.label} className="p-5">
            <p className="text-sm font-semibold text-slate-500">{item.label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-950">{item.value}</p>
          </Card>
        ))}
      </div>
      {sla?.tickets?.length ? (
        <Card className="mb-6 p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-950">SLA monitoring</h2>
              <p className="mt-1 text-sm text-slate-500">Ticket response and resolution performance by customer, agent, and category.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"><p className="text-sm font-bold text-slate-950">{sla.totalTickets}</p><p className="text-[11px] font-semibold text-slate-500">Total</p></div>
              <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2"><p className="text-sm font-bold text-red-700">{sla.breached}</p><p className="text-[11px] font-semibold text-red-600">Breached</p></div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"><p className="text-sm font-bold text-slate-950">{sla.averageFirstResponseMinutes}m</p><p className="text-[11px] font-semibold text-slate-500">First</p></div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"><p className="text-sm font-bold text-slate-950">{sla.averageResolutionMinutes}m</p><p className="text-[11px] font-semibold text-slate-500">Resolve</p></div>
            </div>
          </div>
          <Table columns={slaColumns} data={sla.tickets.slice(0, 12)} />
        </Card>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-5"><h2 className="mb-4 font-semibold text-slate-950">{t("reports.charts.ticketStatus")}</h2><div className="h-80"><ResponsiveContainer><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Legend /><Bar dataKey="tickets" fill="#1E3A8A" /><Bar dataKey="resolved" fill="#16A34A" /></BarChart></ResponsiveContainer></div></Card>
        <Card className="p-5"><h2 className="mb-4 font-semibold text-slate-950">{t("reports.charts.responseTime")}</h2><div className="h-80"><ResponsiveContainer><LineChart data={responseData}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Line dataKey="minutes" stroke="#3B82F6" strokeWidth={3} /></LineChart></ResponsiveContainer></div></Card>
        <Card className="p-5"><h2 className="mb-4 font-semibold text-slate-950">{t("reports.charts.complaintsByStatus")}</h2><div className="h-80"><ResponsiveContainer><BarChart data={statusCounts}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="status" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" fill="#F59E0B" /></BarChart></ResponsiveContainer></div></Card>
        <Card className="p-5"><h2 className="mb-4 font-semibold text-slate-950">{t("reports.charts.priorityMix")}</h2><div className="h-80"><ResponsiveContainer><BarChart data={priorityCounts}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="priority" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" fill="#0284C7" /></BarChart></ResponsiveContainer></div></Card>
        <Card className="p-5"><h2 className="mb-4 font-semibold text-slate-950">{t("reports.charts.customerAnalytics")}</h2><div className="h-80"><ResponsiveContainer><BarChart data={customerSegments}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="segment" /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Bar dataKey="tickets" fill="#1E3A8A" /><Bar dataKey="activeChats" fill="#16A34A" /></BarChart></ResponsiveContainer></div></Card>
        <Card className="p-5"><h2 className="mb-4 font-semibold text-slate-950">{t("reports.charts.agentPerformance")}</h2><div className="h-80"><ResponsiveContainer><BarChart data={agentPerformance}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Legend /><Bar dataKey="resolved" fill="#16A34A" /><Bar dataKey="activeChats" fill="#F59E0B" /></BarChart></ResponsiveContainer></div></Card>
        <Card className="p-5 xl:col-span-2">
          <h2 className="mb-4 font-semibold">{t("reports.charts.liveChatComplaintDashboard")}</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {liveChatStats.map((item) => (
              <div key={item.labelKey} className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-500">{t(item.labelKey)}</p>
                <p className="mt-2 text-2xl font-bold text-slate-950">{item.value}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
