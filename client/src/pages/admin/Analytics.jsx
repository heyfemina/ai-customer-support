import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTranslation } from "react-i18next";
import api from "../../api/axios.js";
import Card from "../../components/common/Card.jsx";
import PageHeader from "../../components/common/PageHeader.jsx";
import { monthlyTickets } from "../../utils/dummyData.js";
import { unwrapData } from "../../utils/helpers.js";
import { demoStore } from "../../utils/demoStore.js";

function buildDemoAnalytics() {
  const tickets = demoStore.tickets();
  const chats = demoStore.chats();
  const agents = demoStore.users().filter((user) => user.role === "AGENT");
  const statusCounts = ["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER", "RESOLVED", "CLOSED"].map((status) => ({
    status,
    count: tickets.filter((ticket) => ticket.status === status).length,
  }));
  const priorityCounts = ["LOW", "MEDIUM", "HIGH", "URGENT"].map((priority) => ({
    priority,
    count: tickets.filter((ticket) => ticket.priority === priority).length,
  }));
  const complaints = tickets.filter((ticket) => ["HIGH", "URGENT"].includes(ticket.priority)).length;
  const customerSegments = [
    { segment: "Billing", tickets: tickets.filter((ticket) => ticket.category === "Billing").length, satisfaction: 91 },
    { segment: "Technical", tickets: tickets.filter((ticket) => ticket.category === "Technical").length || 3, satisfaction: 88 },
    { segment: "AI", tickets: tickets.filter((ticket) => ticket.category === "AI").length, satisfaction: 86 },
    { segment: "Compliance", tickets: tickets.filter((ticket) => ticket.category === "Compliance").length, satisfaction: 95 },
  ];
  const agentPerformance = agents.map((agent, index) => ({
    name: agent.name,
    resolved: 18 + index * 7,
    response: 2.4 - index * 0.3,
    rating: 4.6 + index * 0.1,
  }));
  const liveChatStats = [
    { labelKey: "reports.summary.activeChats", value: chats.filter((chat) => ["ACTIVE", "WAITING", "TRANSFERRED"].includes(chat.status)).length },
    { labelKey: "reports.summary.ratedChats", value: chats.filter((chat) => chat.rating).length },
    { labelKey: "reports.summary.aiTransfers", value: chats.filter((chat) => chat.status === "TRANSFERRED").length },
  ];

  return { statusCounts, priorityCounts, complaints, customerSegments, agentPerformance, liveChatStats };
}

export default function Analytics() {
  const { t } = useTranslation();
  const [ticketReport, setTicketReport] = useState(null);
  const [responseTimes, setResponseTimes] = useState([]);
  const [demoAnalytics, setDemoAnalytics] = useState(buildDemoAnalytics());

  useEffect(() => {
    api.get("/reports/tickets").then(({ data }) => setTicketReport(unwrapData(data))).catch(() => {
      setTicketReport(null);
      setDemoAnalytics(buildDemoAnalytics());
    });
    api.get("/reports/response-time").then(({ data }) => setResponseTimes(unwrapData(data, []))).catch(() => setResponseTimes([]));
  }, []);

  const chartData = ticketReport?.monthlyTickets?.length ? ticketReport.monthlyTickets : monthlyTickets;
  const responseData = responseTimes.length ? responseTimes : monthlyTickets.map((item) => ({ month: item.month, minutes: item.resolved / 100 }));
  const summary = [
    { label: t("reports.summary.openComplaints"), value: demoAnalytics.complaints },
    { label: t("reports.summary.avgResponse"), value: `${responseData.at(-1)?.minutes || 0}m` },
    { label: t("reports.summary.resolvedThisMonth"), value: chartData.at(-1)?.resolved || 0 },
    { label: t("reports.summary.newTicketsThisMonth"), value: chartData.at(-1)?.tickets || 0 },
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
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-5"><h2 className="mb-4 font-semibold">{t("reports.charts.ticketStatus")}</h2><div className="h-80"><ResponsiveContainer><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Legend /><Bar dataKey="tickets" fill="#0284c7" /><Bar dataKey="resolved" fill="#10b981" /></BarChart></ResponsiveContainer></div></Card>
        <Card className="p-5"><h2 className="mb-4 font-semibold">{t("reports.charts.responseTime")}</h2><div className="h-80"><ResponsiveContainer><LineChart data={responseData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Line dataKey="minutes" stroke="#7c3aed" strokeWidth={3} /></LineChart></ResponsiveContainer></div></Card>
        <Card className="p-5"><h2 className="mb-4 font-semibold">{t("reports.charts.complaintsByStatus")}</h2><div className="h-80"><ResponsiveContainer><BarChart data={demoAnalytics.statusCounts}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="status" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" fill="#f59e0b" /></BarChart></ResponsiveContainer></div></Card>
        <Card className="p-5"><h2 className="mb-4 font-semibold">{t("reports.charts.priorityMix")}</h2><div className="h-80"><ResponsiveContainer><BarChart data={demoAnalytics.priorityCounts}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="priority" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="count" fill="#0f766e" /></BarChart></ResponsiveContainer></div></Card>
        <Card className="p-5"><h2 className="mb-4 font-semibold">{t("reports.charts.customerAnalytics")}</h2><div className="h-80"><ResponsiveContainer><BarChart data={demoAnalytics.customerSegments}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="segment" /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Bar dataKey="tickets" fill="#0284c7" /><Bar dataKey="satisfaction" fill="#10b981" /></BarChart></ResponsiveContainer></div></Card>
        <Card className="p-5"><h2 className="mb-4 font-semibold">{t("reports.charts.agentPerformance")}</h2><div className="h-80"><ResponsiveContainer><BarChart data={demoAnalytics.agentPerformance}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Legend /><Bar dataKey="resolved" fill="#10b981" /><Bar dataKey="response" fill="#f59e0b" /></BarChart></ResponsiveContainer></div></Card>
        <Card className="p-5 xl:col-span-2">
          <h2 className="mb-4 font-semibold">{t("reports.charts.liveChatComplaintDashboard")}</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {demoAnalytics.liveChatStats.map((item) => (
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
