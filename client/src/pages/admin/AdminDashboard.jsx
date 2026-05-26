import { useEffect, useState } from "react";
import { Bot, Clock, MessageSquare, Star, Ticket, TrendingUp, Users, CheckCircle2 } from "lucide-react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import api from "../../api/axios.js";
import Card from "../../components/common/Card.jsx";
import PageHeader from "../../components/common/PageHeader.jsx";
import StatCard from "../../components/common/StatCard.jsx";
import TicketTable from "../../components/tickets/TicketTable.jsx";
import { monthlyTickets, satisfaction, stats, tickets } from "../../utils/dummyData.js";
import { unwrapData } from "../../utils/helpers.js";

const icons = [Ticket, Ticket, CheckCircle2, MessageSquare, Clock, Star, TrendingUp, Bot];
const tones = ["sky", "amber", "emerald", "violet", "rose", "sky", "emerald", "violet"];
const pieColors = ["#0284c7", "#10b981", "#f59e0b", "#ef4444"];

export default function AdminDashboard() {
  const [report, setReport] = useState(null);

  useEffect(() => {
    api.get("/reports/dashboard").then(({ data }) => setReport(unwrapData(data))).catch(() => setReport(null));
  }, []);

  const liveStats = report
    ? [
        { title: "Total tickets", value: report.tickets },
        { title: "Open tickets", value: report.open },
        { title: "Resolved tickets", value: report.resolved },
        { title: "Active chats", value: report.chats },
        { title: "Avg response time", value: report.avgResponseTime },
        { title: "Agent rating", value: report.agentRating },
        { title: "Customer satisfaction", value: `${report.csat}%` },
        { title: "AI resolved tickets", value: `${report.aiResolved}%` },
      ]
    : stats;
  const chartData = report?.monthlyTickets?.length ? report.monthlyTickets : monthlyTickets;
  const satisfactionData = report?.satisfaction?.some((item) => item.value > 0) ? report.satisfaction : satisfaction;
  const recentTickets = report?.recentTickets?.length ? report.recentTickets : tickets;

  return (
    <>
      <PageHeader title="Admin dashboard" description="Operational overview across support tickets, chats, AI automation, and satisfaction." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {liveStats.map((stat, index) => <StatCard key={stat.title} {...stat} icon={icons[index]} tone={tones[index]} />)}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card className="p-5">
          <h2 className="mb-4 font-semibold text-slate-950">Monthly ticket performance</h2>
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
          <h2 className="mb-4 font-semibold text-slate-950">Customer satisfaction</h2>
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
        <h2 className="mb-3 font-semibold text-slate-950">Recent tickets</h2>
        <TicketTable tickets={recentTickets} />
      </div>
    </>
  );
}
