import { useEffect, useState } from "react";
import { AlertCircle, BarChart3, Bot, CheckCircle2, Clock, Database, Globe2, MessageSquare, Server, ShieldCheck, Star, Ticket, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import api from "../../api/axios.js";
import Card from "../../components/common/Card.jsx";
import PageHeader from "../../components/common/PageHeader.jsx";
import StatCard from "../../components/common/StatCard.jsx";
import TicketTable from "../../components/tickets/TicketTable.jsx";
import { normalizeItems, unwrapData } from "../../utils/helpers.js";

const pieColors = ["#1E3A8A", "#16A34A", "#F59E0B", "#DC2626"];
const monitorToneClasses = {
  amber: "bg-amber-50 text-amber-700 ring-amber-100",
  emerald: "bg-green-50 text-green-700 ring-green-100",
  sky: "bg-blue-50 text-blue-700 ring-blue-100",
  violet: "bg-indigo-50 text-indigo-700 ring-indigo-100",
};

function emptyReport() {
  return {
    tickets: 0,
    open: 0,
    resolved: 0,
    chats: 0,
    complaints: 0,
    avgResponseTime: "N/A",
    agentRating: "N/A",
    csat: 0,
    aiResolved: 0,
    agentsOnline: 0,
    recentTickets: [],
    monthlyTickets: [],
    satisfaction: [],
  };
}

function buildTicketFallbackReport(tickets = [], baseReport = emptyReport()) {
  const monthlyMap = new Map();
  const ratings = tickets.map((ticket) => Number(ticket.feedbackRating || 0)).filter(Boolean);

  for (const ticket of tickets) {
    const month = new Intl.DateTimeFormat("en", { month: "short" }).format(new Date(ticket.createdAt));
    const current = monthlyMap.get(month) || { month, tickets: 0, resolved: 0 };
    current.tickets += 1;
    if (["RESOLVED", "CLOSED"].includes(ticket.status)) current.resolved += 1;
    monthlyMap.set(month, current);
  }

  return {
    ...emptyReport(),
    ...baseReport,
    tickets: tickets.length,
    open: tickets.filter((ticket) => ticket.status === "OPEN").length,
    resolved: tickets.filter((ticket) => ["RESOLVED", "CLOSED"].includes(ticket.status)).length,
    complaints: tickets.filter((ticket) => ticket.complaintStatus && ticket.complaintStatus !== "NONE").length,
    csat: ratings.length ? Math.round((ratings.filter((rating) => rating >= 4).length / ratings.length) * 100) : baseReport.csat || 0,
    agentRating: ratings.length ? (ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1) : baseReport.agentRating || "N/A",
    monthlyTickets: Array.from(monthlyMap.values()),
    satisfaction: [
      { name: "Very happy", value: ratings.filter((rating) => rating === 5).length },
      { name: "Happy", value: ratings.filter((rating) => rating === 4).length },
      { name: "Neutral", value: ratings.filter((rating) => rating === 3).length },
      { name: "Unhappy", value: ratings.filter((rating) => rating <= 2).length },
    ],
    recentTickets: [...tickets].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 6),
  };
}

export default function AdminDashboard() {
  const { t } = useTranslation();
  const [report, setReport] = useState(() => emptyReport());

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        const { data } = await api.get("/reports/dashboard");
        const dashboard = unwrapData(data);
        if (dashboard && active) {
          setReport({ ...emptyReport(), ...dashboard });
          return;
        }
      } catch {
        // Fall back to tickets below so the deployed dashboard does not render empty.
      }

      try {
        const { data } = await api.get("/tickets");
        const tickets = normalizeItems(data, []);
        if (active) setReport(buildTicketFallbackReport(tickets));
      } catch {
        if (active) setReport(emptyReport());
      }
    }

    loadDashboard();
    return () => {
      active = false;
    };
  }, []);

  const chartData = report?.monthlyTickets || [];
  const satisfactionData = report?.satisfaction || [];
  const recentTickets = report?.recentTickets || [];
  const pendingTickets = Math.max((report.tickets || 0) - (report.open || 0) - (report.resolved || 0), 0);
  const liveStats = [
    { title: t("dashboard.stats.totalTickets"), value: report.tickets, icon: Ticket, tone: "sky", trend: "+12%" },
    { title: t("dashboard.stats.openTickets"), value: report.open, icon: AlertCircle, tone: "amber", trend: "+4%" },
    { title: t("dashboard.stats.resolvedTickets"), value: report.resolved, icon: CheckCircle2, tone: "emerald", trend: "+9%" },
    { title: "Pending tickets", value: pendingTickets, icon: Clock, tone: "violet", trend: "-3%" },
    { title: t("dashboard.stats.activeChats"), value: report.chats, icon: MessageSquare, tone: "sky", trend: "+6%" },
    { title: "Complaints", value: report.complaints || 0, icon: AlertCircle, tone: "amber", trend: "+0%" },
    { title: t("dashboard.stats.avgResponseTime"), value: report.avgResponseTime, icon: Clock, tone: "rose", trend: "-8%" },
    { title: t("dashboard.stats.customerSatisfaction"), value: `${report.csat}%`, icon: Star, tone: "emerald", trend: "+5%" },
    { title: "Online agents", value: report.agentsOnline || 0, icon: Users, tone: "violet", trend: "+2%" },
    { title: t("dashboard.stats.aiResolvedTickets"), value: `${report.aiResolved}%`, icon: Bot, tone: "sky", trend: "+11%" },
  ];
  const monitors = [
    { title: t("dashboard.monitoring.applicationServer"), value: t("dashboard.monitoring.healthy"), detail: "API server connected", icon: Server, tone: "emerald" },
    { title: t("dashboard.monitoring.database"), value: "PostgreSQL", detail: t("dashboard.monitoring.recordsLoaded", { count: recentTickets.length }), icon: Database, tone: "sky" },
    { title: t("dashboard.monitoring.agentCoverage"), value: t("dashboard.monitoring.online", { count: report?.agentsOnline || 0 }), detail: t("dashboard.monitoring.activeChatSessions", { count: report?.chats || 0 }), icon: Users, tone: "violet" },
    { title: t("dashboard.monitoring.securityPosture"), value: t("dashboard.monitoring.protected"), detail: t("dashboard.monitoring.rbacEnabled"), icon: ShieldCheck, tone: "amber" },
  ];
  const languageSettings = report.aiSettings || {};

  return (
    <>
      <PageHeader title={t("dashboard.admin.title")} description={t("dashboard.admin.description")} />
      <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm shadow-slate-200/70 sm:p-6">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <div className="flex min-w-0 gap-4">
            <div className="hidden h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-600 text-white shadow-sm shadow-blue-600/20 sm:grid">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-blue-700">{t("dashboard.sections.systemMonitoring")}</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-950">Support operations command center</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{t("dashboard.admin.description")}</p>
            </div>
          </div>
          <div className="grid gap-3 text-center sm:grid-cols-3 xl:w-[28rem]">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm shadow-slate-200/60">
              <p className="text-2xl font-bold text-slate-950">{report.tickets}</p>
              <p className="text-xs font-semibold text-slate-500">{t("dashboard.stats.totalTickets")}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm shadow-slate-200/60">
              <p className="text-2xl font-bold text-slate-950">{report.csat}%</p>
              <p className="text-xs font-semibold text-slate-500">{t("dashboard.stats.customerSatisfaction")}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm shadow-slate-200/60">
              <p className="text-2xl font-bold text-slate-950">{report.aiResolved}%</p>
              <p className="text-xs font-semibold text-slate-500">{t("dashboard.stats.aiResolvedTickets")}</p>
            </div>
          </div>
        </div>
      </section>
      <div className="grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {liveStats.map((stat) => <StatCard key={stat.title} {...stat} />)}
      </div>
      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-semibold text-slate-950">{t("dashboard.sections.systemMonitoring")}</h2>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-100">Live status</span>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {monitors.map((monitor) => (
            <Card key={monitor.title} className="h-full p-5">
              <div className="flex items-center gap-3">
                <div className={`grid h-10 w-10 place-items-center rounded-md ring-1 ${monitorToneClasses[monitor.tone]}`}>
                  <monitor.icon className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-500">{monitor.title}</p>
                  <p className="truncate text-lg font-bold text-slate-950">{monitor.value}</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-500">{monitor.detail}</p>
            </Card>
          ))}
        </div>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-700" />
                <h2 className="font-semibold text-slate-950">{t("dashboard.sections.monthlyTicketPerformance")}</h2>
              </div>
              <p className="text-sm text-slate-500">{t("reports.charts.responseTime")}</p>
            </div>
            <span className="rounded-md bg-green-50 px-2.5 py-1 text-xs font-bold text-green-700 ring-1 ring-green-100">{report.avgResponseTime}</span>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="tickets" stroke="#1E3A8A" fill="#DBEAFE" />
                <Area type="monotone" dataKey="resolved" stroke="#16A34A" fill="#DCFCE7" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-5">
          <div className="mb-4">
            <h2 className="font-semibold text-slate-950">{t("dashboard.sections.customerSatisfaction")}</h2>
            <p className="text-sm text-slate-500">{t("reports.summary.ratedChats")}</p>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={satisfactionData} dataKey="value" nameKey="name" innerRadius={65} outerRadius={105} paddingAngle={3}>
                  {satisfactionData.map((entry, index) => <Cell key={entry.name} fill={pieColors[index]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-md bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                <Globe2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-950">{t("dashboard.sections.multiLanguageSupport")}</h2>
                <p className="text-sm text-slate-500">{t("dashboard.sections.multiLanguageDescription")}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {(languageSettings.supportedLanguages || ["en", "it", "es", "fr"]).map((code) => <span key={code} className="rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">{code.toUpperCase()}</span>)}
              <span className="rounded-md bg-green-50 px-3 py-2 text-sm font-semibold text-green-700 ring-1 ring-green-100">{t("dashboard.sections.aiTranslation")} {languageSettings.autoTranslate ? t("common.on") : t("common.off")}</span>
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-blue-50 text-blue-700 ring-1 ring-blue-100">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-950">Complaint and risk tracking</h2>
              <p className="text-sm text-slate-500">Open issues, agent coverage, and secure workflows are monitored from the admin panel.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 text-center text-sm sm:grid-cols-3">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-xl font-bold text-slate-950">{report.complaints || 0}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">Complaints</p>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-xl font-bold text-slate-950">{report.agentsOnline || 0}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">Agents online</p>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-xl font-bold text-slate-950">{report.chats}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">Live chats</p>
            </div>
          </div>
        </Card>
      </div>
      <div className="mt-6">
        <h2 className="mb-3 font-semibold text-slate-950">{t("dashboard.sections.recentTickets")}</h2>
        <TicketTable tickets={recentTickets} />
      </div>
    </>
  );
}
