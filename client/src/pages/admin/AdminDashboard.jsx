import { useEffect, useState } from "react";
import { Bot, Clock, Database, Globe2, MessageSquare, Server, ShieldCheck, Star, Ticket, TrendingUp, Users, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import api from "../../api/axios.js";
import Card from "../../components/common/Card.jsx";
import PageHeader from "../../components/common/PageHeader.jsx";
import StatCard from "../../components/common/StatCard.jsx";
import TicketTable from "../../components/tickets/TicketTable.jsx";
import { monthlyTickets, satisfaction, tickets } from "../../utils/dummyData.js";
import { unwrapData } from "../../utils/helpers.js";
import { demoStore } from "../../utils/demoStore.js";

const icons = [Ticket, Ticket, CheckCircle2, MessageSquare, Clock, Star, TrendingUp, Bot];
const tones = ["sky", "amber", "emerald", "violet", "rose", "sky", "emerald", "violet"];
const pieColors = ["#0284c7", "#10b981", "#f59e0b", "#ef4444"];
const monitorToneClasses = {
  amber: "bg-amber-50 text-amber-700",
  emerald: "bg-emerald-50 text-emerald-700",
  sky: "bg-sky-50 text-sky-700",
  violet: "bg-violet-50 text-violet-700",
};

function buildDemoReport() {
  const demoTickets = demoStore.tickets();
  const demoChats = demoStore.chats();
  const demoUsers = demoStore.users();
  const resolved = demoTickets.filter((ticket) => ["RESOLVED", "CLOSED"].includes(ticket.status)).length;
  const activeChats = demoChats.filter((chat) => ["ACTIVE", "WAITING", "TRANSFERRED"].includes(chat.status)).length;

  return {
    tickets: demoTickets.length,
    open: demoTickets.filter((ticket) => ticket.status === "OPEN").length,
    resolved,
    chats: activeChats,
    avgResponseTime: "2m 10s",
    agentRating: "4.8/5",
    csat: 94,
    aiResolved: 61,
    agentsOnline: demoUsers.filter((user) => user.role === "AGENT" && user.isActive).length,
    recentTickets: demoTickets.slice(0, 6),
  };
}

export default function AdminDashboard() {
  const { t } = useTranslation();
  const [report, setReport] = useState(() => buildDemoReport());

  useEffect(() => {
    api.get("/reports/dashboard").then(({ data }) => setReport(unwrapData(data))).catch(() => setReport(buildDemoReport()));
  }, []);

  const liveStats = [
    { title: t("dashboard.stats.totalTickets"), value: report.tickets },
    { title: t("dashboard.stats.openTickets"), value: report.open },
    { title: t("dashboard.stats.resolvedTickets"), value: report.resolved },
    { title: t("dashboard.stats.activeChats"), value: report.chats },
    { title: t("dashboard.stats.avgResponseTime"), value: report.avgResponseTime },
    { title: t("dashboard.stats.agentRating"), value: report.agentRating },
    { title: t("dashboard.stats.customerSatisfaction"), value: `${report.csat}%` },
    { title: t("dashboard.stats.aiResolvedTickets"), value: `${report.aiResolved}%` },
  ];
  const chartData = report?.monthlyTickets?.length ? report.monthlyTickets : monthlyTickets;
  const satisfactionData = report?.satisfaction?.some((item) => item.value > 0) ? report.satisfaction : satisfaction;
  const recentTickets = report?.recentTickets?.length ? report.recentTickets : demoStore.tickets().slice(0, 6) || tickets;
  const monitors = [
    { title: t("dashboard.monitoring.applicationServer"), value: t("dashboard.monitoring.healthy"), detail: t("dashboard.monitoring.demoMode"), icon: Server, tone: "emerald" },
    { title: t("dashboard.monitoring.database"), value: t("dashboard.monitoring.localStore"), detail: t("dashboard.monitoring.recordsLoaded", { count: recentTickets.length }), icon: Database, tone: "sky" },
    { title: t("dashboard.monitoring.agentCoverage"), value: t("dashboard.monitoring.online", { count: report?.agentsOnline || 0 }), detail: t("dashboard.monitoring.activeChatSessions", { count: report?.chats || 0 }), icon: Users, tone: "violet" },
    { title: t("dashboard.monitoring.securityPosture"), value: t("dashboard.monitoring.protected"), detail: t("dashboard.monitoring.rbacEnabled"), icon: ShieldCheck, tone: "amber" },
  ];
  const languageSettings = demoStore.aiSettings();

  return (
    <>
      <PageHeader title={t("dashboard.admin.title")} description={t("dashboard.admin.description")} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {liveStats.map((stat, index) => <StatCard key={stat.title} {...stat} icon={icons[index]} tone={tones[index]} />)}
      </div>
      <div className="mt-6">
        <h2 className="mb-3 font-semibold text-slate-950">{t("dashboard.sections.systemMonitoring")}</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {monitors.map((monitor) => (
            <Card key={monitor.title} className="p-5">
              <div className="flex items-center gap-3">
                <div className={`grid h-10 w-10 place-items-center rounded-md ${monitorToneClasses[monitor.tone]}`}>
                  <monitor.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-500">{monitor.title}</p>
                  <p className="text-lg font-bold text-slate-950">{monitor.value}</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-500">{monitor.detail}</p>
            </Card>
          ))}
        </div>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card className="p-5">
          <h2 className="mb-4 font-semibold text-slate-950">{t("dashboard.sections.monthlyTicketPerformance")}</h2>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="tickets" stroke="#0284c7" fill="#bae6fd" />
                <Area type="monotone" dataKey="resolved" stroke="#10b981" fill="#bbf7d0" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="mb-4 font-semibold text-slate-950">{t("dashboard.sections.customerSatisfaction")}</h2>
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
      <div className="mt-6">
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-md bg-sky-50 text-sky-700">
                <Globe2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-950">{t("dashboard.sections.multiLanguageSupport")}</h2>
                <p className="text-sm text-slate-500">{t("dashboard.sections.multiLanguageDescription")}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {(languageSettings.supportedLanguages || ["en", "it", "es", "fr"]).map((code) => <span key={code} className="rounded-md bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">{code.toUpperCase()}</span>)}
              <span className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{t("dashboard.sections.aiTranslation")} {languageSettings.autoTranslate ? t("common.on") : t("common.off")}</span>
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
