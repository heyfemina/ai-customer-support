import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import api from "../../api/axios.js";
import Card from "../../components/common/Card.jsx";
import PageHeader from "../../components/common/PageHeader.jsx";
import { monthlyTickets } from "../../utils/dummyData.js";
import { unwrapData } from "../../utils/helpers.js";

export default function Analytics() {
  const [ticketReport, setTicketReport] = useState(null);
  const [responseTimes, setResponseTimes] = useState([]);

  useEffect(() => {
    api.get("/reports/tickets").then(({ data }) => setTicketReport(unwrapData(data))).catch(() => setTicketReport(null));
    api.get("/reports/response-time").then(({ data }) => setResponseTimes(unwrapData(data, []))).catch(() => setResponseTimes([]));
  }, []);

  const chartData = ticketReport?.monthlyTickets?.length ? ticketReport.monthlyTickets : monthlyTickets;
  const responseData = responseTimes.length ? responseTimes : monthlyTickets.map((item) => ({ month: item.month, minutes: item.resolved / 100 }));

  return (
    <>
      <PageHeader title="Analytics and reports" description="Customer analytics, response-time monitoring, complaint tracking, and live chat statistics." />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-5"><h2 className="mb-4 font-semibold">Ticket status chart</h2><div className="h-80"><ResponsiveContainer><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Legend /><Bar dataKey="tickets" fill="#0284c7" /><Bar dataKey="resolved" fill="#10b981" /></BarChart></ResponsiveContainer></div></Card>
        <Card className="p-5"><h2 className="mb-4 font-semibold">Response time trend</h2><div className="h-80"><ResponsiveContainer><LineChart data={responseData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Line dataKey="minutes" stroke="#7c3aed" strokeWidth={3} /></LineChart></ResponsiveContainer></div></Card>
      </div>
    </>
  );
}
