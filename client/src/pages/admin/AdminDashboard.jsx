import { useCallback, useEffect, useState } from "react";
import { AlertCircle, BarChart3, Bot, CheckCircle2, Clock, Database, Globe2, MessageSquare, Server, ShieldCheck, Star, Ticket, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import api from "../../api/axios.js";
import Card from "../../components/common/Card.jsx";
import PageHeader from "../../components/common/PageHeader.jsx";
import StatCard from "../../components/common/StatCard.jsx";
import TicketTable from "../../components/tickets/TicketTable.jsx";
import { extractArray, normalizeItems, normalizeTotal, unwrapData } from "../../utils/helpers.js";

const pieColors = ["#1E3A8A", "#16A34A", "#F59E0B", "#DC2626"];
const closedTicketStatuses = ["RESOLVED", "AUTO_CLOSED", "CLOSED"];
const activeChatStatuses = ["ASSIGNED", "ACTIVE", "WAITING", "TRANSFERRED"];
const monitorToneClasses = {
  amber: "bg-amber-50 text-amber-700 ring-amber-100",
  emerald: "bg-green-50 text-green-700 ring-green-100",
  sky: "bg-blue-50 text-blue-700 ring-blue-100",
  violet: "bg-indigo-50 text-indigo-700 ring-indigo-100",
};

function normalizeStatus(status) {
  return String(status || "").trim().replace(/\s+/g, "_").toUpperCase();
}

function emptyReport() {
  return {
    totalTickets: 0,
    openTickets: 0,
    resolvedTickets: 0,
    pendingTickets: 0,
    activeChats: 0,
    customerSatisfaction: 0,
    aiResolvedTickets: 0,
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
    if (closedTicketStatuses.includes(normalizeStatus(ticket.status))) current.resolved += 1;
    monthlyMap.set(month, current);
  }

  return {
    ...emptyReport(),
    ...baseReport,
    tickets: tickets.length,
    open: tickets.filter((ticket) => normalizeStatus(ticket.status) === "OPEN").length,
    resolved: tickets.filter((ticket) => closedTicketStatuses.includes(normalizeStatus(ticket.status))).length,
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

function hasDashboardCounts(dashboard) {
  if (!dashboard || typeof dashboard !== "object") return false;
  return [
    dashboard.totalTickets,
    dashboard.openTickets,
    dashboard.resolvedTickets,
    dashboard.pendingTickets,
    dashboard.activeChats,
    dashboard.complaints,
    dashboard.agentsOnline,
    dashboard.tickets,
    dashboard.chats,
    dashboard.customers,
    dashboard.agents,
  ].some((value) => Number(value) > 0);
}

function resolveStatNumber(...values) {
  const numbers = values.map((value) => Number(value)).filter((value) => Number.isFinite(value));
  return numbers.find((value) => value !== 0) ?? numbers[0] ?? 0;
}

export default function AdminDashboard() {
  const { t } = useTranslation();
  const [report, setReport] = useState(() => emptyReport());
  const [loading, setLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [loadError, setLoadError] = useState("");

  const loadDashboard = useCallback(async () => {
      setLoadError("");
      try {
        const { data } = await api.get("/reports/dashboard");
        const dashboard = unwrapData(data);
        if (hasDashboardCounts(dashboard)) {
          setReport({ ...emptyReport(), ...dashboard });
          setHasLoadedOnce(true);
          setLoading(false);
          return;
        }
      } catch (error) {
        setLoadError(error.friendlyMessage || "Unable to load dashboard report. Trying live fallback data.");
        // Fall back to tickets below so the deployed dashboard does not render empty.
      }

      try {
        const [ticketResult, chatResult, agentResult] = await Promise.allSettled([
          api.get("/tickets", { params: { page: 1, limit: 50 } }),
          api.get("/chats"),
          api.get("/reports/agents"),
        ]);
        const ticketPayload = ticketResult.status === "fulfilled" ? ticketResult.value.data : null;
        const tickets = ticketResult.status === "fulfilled" ? extractArray(ticketResult.value, "tickets") : [];
        const ticketTotal = normalizeTotal(ticketPayload, tickets);
        const chats = chatResult.status === "fulfilled" ? extractArray(chatResult.value, "chats") : [];
        const agents = agentResult.status === "fulfilled" ? normalizeItems(agentResult.value.data, []) : [];
        setReport({
          ...buildTicketFallbackReport(tickets),
          tickets: ticketTotal,
          totalTickets: ticketTotal,
          activeChats: chats.filter((chat) => activeChatStatuses.includes(normalizeStatus(chat.status))).length,
          chats: chats.filter((chat) => activeChatStatuses.includes(normalizeStatus(chat.status))).length,
          agentsOnline: agents.filter((agent) => agent.isActive && agent.agentStatus !== "OFFLINE").length,
        });
      } catch (error) {
        setLoadError(error.friendlyMessage || "Unable to load live dashboard data. Check backend API connection.");
        setReport(emptyReport());
      } finally {
        setHasLoadedOnce(true);
        setLoading(false);
      }
  }, []);

  useEffect(() => {
    loadDashboard();
    const intervalId = window.setInterval(loadDashboard, 15000);
    window.addEventListener("focus", loadDashboard);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", loadDashboard);
    };
  }, [loadDashboard]);

  const chartData = report?.monthlyTickets || [];
  const satisfactionData = report?.satisfaction || [];
  const recentTickets = report?.recentTickets || [];
  const totalTickets = resolveStatNumber(report.totalTickets, report.tickets);
  const openTickets = resolveStatNumber(report.openTickets, report.open);
  const resolvedTickets = resolveStatNumber(report.resolvedTickets, report.resolved);
  const pendingTickets = resolveStatNumber(report.pendingTickets, report.pending, Math.max(totalTickets - openTickets - resolvedTickets, 0));
  const activeChats = resolveStatNumber(report.activeChats, report.chats);
  const customerSatisfaction = resolveStatNumber(report.customerSatisfaction, report.csat);
  const aiResolvedTickets = resolveStatNumber(report.aiResolvedTickets, report.aiResolved);
  const agentsOnline = resolveStatNumber(report.agentsOnline);
  const liveStats = [
    { title: t("dashboard.stats.totalTickets"), value: totalTickets, icon: Ticket, tone: "sky" },
    { title: t("dashboard.stats.openTickets"), value: openTickets, icon: AlertCircle, tone: "amber" },
    { title: t("dashboard.stats.resolvedTickets"), value: resolvedTickets, icon: CheckCircle2, tone: "emerald" },
    { title: t("dashboard.stats.pendingTickets"), value: pendingTickets, icon: Clock, tone: "violet" },
    { title: t("dashboard.stats.activeChats"), value: activeChats, icon: MessageSquare, tone: "sky" },
    { title: t("table.complaints"), value: report.complaints ?? 0, icon: AlertCircle, tone: "amber" },
    { title: t("dashboard.stats.avgResponseTime"), value: report.avgResponseTime ?? "N/A", icon: Clock, tone: "rose" },
    { title: t("dashboard.stats.customerSatisfaction"), value: `${customerSatisfaction}%`, icon: Star, tone: "emerald" },
    { title: t("common.agentsOnline"), value: agentsOnline, icon: Users, tone: "violet" },
    { title: t("dashboard.stats.aiResolvedTickets"), value: `${aiResolvedTickets}%`, icon: Bot, tone: "sky" },
  ];
  const monitors = [
    { title: t("dashboard.monitoring.applicationServer"), value: t("dashboard.monitoring.healthy"), detail: t("common.apiServerConnected"), icon: Server, tone: "emerald" },
    { title: t("dashboard.monitoring.database"), value: "PostgreSQL", detail: t("dashboard.monitoring.recordsLoaded", { count: recentTickets.length }), icon: Database, tone: "sky" },
    { title: t("dashboard.monitoring.agentCoverage"), value: t("dashboard.monitoring.online", { count: agentsOnline }), detail: t("dashboard.monitoring.activeChatSessions", { count: activeChats }), icon: Users, tone: "violet" },
    { title: t("dashboard.monitoring.securityPosture"), value: t("dashboard.monitoring.protected"), detail: t("dashboard.monitoring.rbacEnabled"), icon: ShieldCheck, tone: "amber" },
  ];
  const languageSettings = report.aiSettings || {};

  return (
    <>
      <PageHeader title={t("dashboard.admin.title")} description={t("dashboard.admin.description")} />
      {loadError ? <p className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">{loadError}</p> : null}
      <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-sm shadow-slate-200/70 sm:p-6">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <div className="flex min-w-0 gap-4">
            <div className="hidden h-12 w-12 shrink-0 place-items-center rounded-2xl bg-blue-600 text-white shadow-sm shadow-blue-600/20 sm:grid">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-blue-700">{t("dashboard.sections.systemMonitoring")}</p>
              <h2 className="mt-2 text-2xl font-bold text-slate-950">{t("common.supportOperationsCommandCenter")}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{t("dashboard.admin.description")}</p>
            </div>
          </div>
          <div className="grid gap-3 text-center sm:grid-cols-3 xl:w-[28rem]">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm shadow-slate-200/60">
              <p className="text-2xl font-bold text-slate-950">{totalTickets}</p>
              <p className="text-xs font-semibold text-slate-500">{t("dashboard.stats.totalTickets")}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm shadow-slate-200/60">
              <p className="text-2xl font-bold text-slate-950">{customerSatisfaction}%</p>
              <p className="text-xs font-semibold text-slate-500">{t("dashboard.stats.customerSatisfaction")}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm shadow-slate-200/60">
              <p className="text-2xl font-bold text-slate-950">{aiResolvedTickets}%</p>
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
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-100">{t("common.liveStatus")}</span>
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
              <h2 className="font-semibold text-slate-950">{t("common.complaintRiskTracking")}</h2>
              <p className="text-sm text-slate-500">{t("common.complaintRiskDescription")}</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 text-center text-sm sm:grid-cols-3">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-xl font-bold text-slate-950">{report.complaints || 0}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">{t("table.complaints")}</p>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-xl font-bold text-slate-950">{agentsOnline}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">{t("common.agentsOnline")}</p>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              <p className="text-xl font-bold text-slate-950">{activeChats}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">{t("dashboard.stats.liveChats")}</p>
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
