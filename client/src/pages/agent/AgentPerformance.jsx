import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTranslation } from "react-i18next";
import api from "../../api/axios.js";
import Button from "../../components/common/Button.jsx";
import Card from "../../components/common/Card.jsx";
import PageHeader from "../../components/common/PageHeader.jsx";
import { unwrapData } from "../../utils/helpers.js";
import { downloadReport } from "../../utils/downloadReport.js";

export default function AgentPerformance() {
  const { t } = useTranslation();
  const [report, setReport] = useState([]);
  const [agents, setAgents] = useState([]);
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState("");
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
    { label: t("reports.agentPerformance.resolvedTickets"), value: agents.reduce((sum, agent) => sum + (agent.resolvedTickets || 0), 0) },
    { label: t("reports.summary.avgResponse"), value: `${(agents.reduce((sum, agent) => sum + (agent.avgFirstResponseMinutes || 0), 0) / Math.max(agents.length, 1)).toFixed(1)}m` },
    { label: t("reports.agentPerformance.avgRating"), value: `${(agents.reduce((sum, agent) => sum + (agent.rating || 0), 0) / Math.max(agents.length, 1)).toFixed(1)}/5` },
    { label: t("reports.agentPerformance.complaints"), value: agents.reduce((sum, agent) => sum + (agent.complaintCount || 0), 0) },
  ];
  const agentChartRows = agents.map((agent) => ({
    ...agent,
    response: agent.avgFirstResponseMinutes || 0,
    resolved: agent.resolvedTickets || 0,
    complaints: agent.complaintCount || 0,
    rating: Number(agent.rating) || 0,
  }));
  const exportAgents = async () => {
    setExporting(true);
    setNotice("");
    try {
      await downloadReport("/reports/export/agents?format=csv", "agents-report.csv");
      setNotice("agents-report.csv downloaded.");
    } catch {
      setNotice("Unable to download report. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <PageHeader title={t("reports.charts.agentPerformance")} description={t("reports.agentPerformance.description")} actions={<Button variant="secondary" loading={exporting} onClick={exportAgents}>Export report</Button>} />
      {notice ? <p className="mb-4 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm">{notice}</p> : null}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map((item) => <Card key={item.label} className="p-5"><p className="text-sm font-semibold text-slate-500">{item.label}</p><p className="mt-2 text-2xl font-bold text-slate-950">{item.value}</p></Card>)}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card className="p-5"><h2 className="mb-4 font-semibold">{t("reports.agentPerformance.monthlyResolution")}</h2><div className="h-80"><ResponsiveContainer><BarChart data={report}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Bar dataKey="resolved" fill="#10b981" /></BarChart></ResponsiveContainer></div></Card>
        <Card className="p-5"><h2 className="mb-4 font-semibold">{t("reports.agentPerformance.responseAndRating")}</h2><div className="h-80"><ResponsiveContainer><LineChart data={agentChartRows}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Legend /><Line dataKey="response" stroke="#f59e0b" strokeWidth={3} /><Line dataKey="rating" stroke="#0284c7" strokeWidth={3} /></LineChart></ResponsiveContainer></div></Card>
        <Card className="p-5 xl:col-span-2"><h2 className="mb-4 font-semibold">{t("reports.agentPerformance.performanceComplaintTracking")}</h2><div className="h-80"><ResponsiveContainer><BarChart data={agentChartRows}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Bar dataKey="resolved" fill="#10b981" /><Bar dataKey="complaints" fill="#ef4444" /></BarChart></ResponsiveContainer></div></Card>
      </div>
    </>
  );
}
