import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTranslation } from "react-i18next";
import api from "../../api/axios.js";
import Card from "../../components/common/Card.jsx";
import PageHeader from "../../components/common/PageHeader.jsx";
import { unwrapData } from "../../utils/helpers.js";

export default function AgentPerformance() {
  const { t } = useTranslation();
  const [report, setReport] = useState([]);
  const [agents, setAgents] = useState([]);
  useEffect(() => {
    api.get("/reports/tickets").then(({ data }) => {
      const payload = unwrapData(data);
      setReport(payload?.monthlyTickets?.length ? payload.monthlyTickets : []);
    }).catch(() => setReport([]));
    api.get("/reports/agents").then(({ data }) => {
      const rows = unwrapData(data, []);
      if (rows.length) setAgents(rows);
    }).catch(() => setAgents([]));
  }, []);
  const summary = [
    { label: t("reports.agentPerformance.resolvedTickets"), value: agents.reduce((sum, agent) => sum + (agent.resolved || 0), 0) },
    { label: t("reports.summary.avgResponse"), value: `${(agents.reduce((sum, agent) => sum + (agent.response || 0), 0) / Math.max(agents.length, 1)).toFixed(1)}m` },
    { label: t("reports.agentPerformance.avgRating"), value: `${(agents.reduce((sum, agent) => sum + (agent.rating || 0), 0) / Math.max(agents.length, 1)).toFixed(1)}/5` },
    { label: t("reports.agentPerformance.complaints"), value: agents.reduce((sum, agent) => sum + (agent.complaints || 0), 0) },
  ];

  return (
    <>
      <PageHeader title={t("reports.charts.agentPerformance")} description={t("reports.agentPerformance.description")} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map((item) => <Card key={item.label} className="p-5"><p className="text-sm font-semibold text-slate-500">{item.label}</p><p className="mt-2 text-2xl font-bold text-slate-950">{item.value}</p></Card>)}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card className="p-5"><h2 className="mb-4 font-semibold">{t("reports.agentPerformance.monthlyResolution")}</h2><div className="h-80"><ResponsiveContainer><BarChart data={report}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Bar dataKey="resolved" fill="#10b981" /></BarChart></ResponsiveContainer></div></Card>
        <Card className="p-5"><h2 className="mb-4 font-semibold">{t("reports.agentPerformance.responseAndRating")}</h2><div className="h-80"><ResponsiveContainer><LineChart data={agents}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Legend /><Line dataKey="response" stroke="#f59e0b" strokeWidth={3} /><Line dataKey="rating" stroke="#0284c7" strokeWidth={3} /></LineChart></ResponsiveContainer></div></Card>
        <Card className="p-5 xl:col-span-2"><h2 className="mb-4 font-semibold">{t("reports.agentPerformance.performanceComplaintTracking")}</h2><div className="h-80"><ResponsiveContainer><BarChart data={agents}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Bar dataKey="resolved" fill="#10b981" /><Bar dataKey="complaints" fill="#ef4444" /></BarChart></ResponsiveContainer></div></Card>
      </div>
    </>
  );
}
