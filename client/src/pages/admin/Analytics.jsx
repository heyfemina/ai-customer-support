import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTranslation } from "react-i18next";
import api from "../../api/axios.js";
import Card from "../../components/common/Card.jsx";
import PageHeader from "../../components/common/PageHeader.jsx";
import { normalizeItems, unwrapData } from "../../utils/helpers.js";

export default function Analytics() {
  const { t } = useTranslation();
  const [ticketReport, setTicketReport] = useState(null);
  const [responseTimes, setResponseTimes] = useState([]);
  const [sla, setSla] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [agents, setAgents] = useState([]);
  const [chats, setChats] = useState([]);

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
    { labelKey: "reports.summary.activeChats", value: chats.filter((chat) => ["ACTIVE", "WAITING", "TRANSFERRED"].includes(chat.status)).length },
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

  return (
    <>
      <PageHeader title={t("reports.title")} description={t("reports.description")} />
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
          <h2 className="mb-4 font-semibold">SLA monitoring</h2>
          <div className="overflow-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="border-b text-slate-500"><th className="py-2">Ticket</th><th>Priority</th><th>First response</th><th>Resolution</th><th>SLA</th></tr></thead>
              <tbody>{sla.tickets.slice(0, 8).map((ticket) => <tr key={ticket.id} className="border-b"><td className="py-2 font-semibold">{ticket.subject}</td><td>{ticket.priority}</td><td>{ticket.firstResponseMinutes ?? "Pending"}m</td><td>{ticket.resolutionMinutes ?? "Pending"}m</td><td className={ticket.slaBreached ? "font-bold text-rose-700" : "font-bold text-emerald-700"}>{ticket.slaBreached ? "Breached" : "OK"}</td></tr>)}</tbody>
            </table>
          </div>
        </Card>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-5"><h2 className="mb-4 font-semibold">{t("reports.charts.ticketStatus")}</h2><div className="h-80"><ResponsiveContainer><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Legend /><Bar dataKey="tickets" fill="#0284c7" /><Bar dataKey="resolved" fill="#10b981" /></BarChart></ResponsiveContainer></div></Card>
        <Card className="p-5"><h2 className="mb-4 font-semibold">{t("reports.charts.responseTime")}</h2><div className="h-80"><ResponsiveContainer><LineChart data={responseData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Line dataKey="minutes" stroke="#7c3aed" strokeWidth={3} /></LineChart></ResponsiveContainer></div></Card>
        <Card className="p-5"><h2 className="mb-4 font-semibold">{t("reports.charts.complaintsByStatus")}</h2><div className="h-80"><ResponsiveContainer><BarChart data={statusCounts}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="status" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" fill="#f59e0b" /></BarChart></ResponsiveContainer></div></Card>
        <Card className="p-5"><h2 className="mb-4 font-semibold">{t("reports.charts.priorityMix")}</h2><div className="h-80"><ResponsiveContainer><BarChart data={priorityCounts}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="priority" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" fill="#0f766e" /></BarChart></ResponsiveContainer></div></Card>
        <Card className="p-5"><h2 className="mb-4 font-semibold">{t("reports.charts.customerAnalytics")}</h2><div className="h-80"><ResponsiveContainer><BarChart data={customerSegments}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="segment" /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Bar dataKey="tickets" fill="#0284c7" /><Bar dataKey="activeChats" fill="#10b981" /></BarChart></ResponsiveContainer></div></Card>
        <Card className="p-5"><h2 className="mb-4 font-semibold">{t("reports.charts.agentPerformance")}</h2><div className="h-80"><ResponsiveContainer><BarChart data={agentPerformance}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Legend /><Bar dataKey="resolved" fill="#10b981" /><Bar dataKey="activeChats" fill="#f59e0b" /></BarChart></ResponsiveContainer></div></Card>
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
