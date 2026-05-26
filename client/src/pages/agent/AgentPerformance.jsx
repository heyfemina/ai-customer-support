import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import api from "../../api/axios.js";
import Card from "../../components/common/Card.jsx";
import PageHeader from "../../components/common/PageHeader.jsx";
import { monthlyTickets } from "../../utils/dummyData.js";
import { unwrapData } from "../../utils/helpers.js";

export default function AgentPerformance() {
  const [report, setReport] = useState(monthlyTickets);
  useEffect(() => {
    api.get("/reports/tickets").then(({ data }) => {
      const payload = unwrapData(data);
      setReport(payload?.monthlyTickets?.length ? payload.monthlyTickets : monthlyTickets);
    }).catch(() => setReport(monthlyTickets));
  }, []);
  return (
    <>
      <PageHeader title="Agent performance reports" description="Resolution volume, customer satisfaction, average response, and complaint trends." />
      <Card className="p-5"><div className="h-96"><ResponsiveContainer><BarChart data={report}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Bar dataKey="resolved" fill="#10b981" /></BarChart></ResponsiveContainer></div></Card>
    </>
  );
}
