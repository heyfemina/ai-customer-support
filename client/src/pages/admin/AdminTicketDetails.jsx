import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api, { uploadFile } from "../../api/axios.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import Card from "../../components/common/Card.jsx";
import Button from "../../components/common/Button.jsx";
import TicketStatusBadge from "../../components/tickets/TicketStatusBadge.jsx";
import TicketTimeline from "../../components/tickets/TicketTimeline.jsx";
import { tickets } from "../../utils/dummyData.js";
import { normalizeItems } from "../../utils/helpers.js";
import Badge from "../../components/common/Badge.jsx";
import { useTranslation } from "react-i18next";
import { demoStore } from "../../utils/demoStore.js";

export default function AdminTicketDetails() {
  const { id } = useParams();
  const { t } = useTranslation();
  const [ticket, setTicket] = useState(tickets.find((item) => item.id === id) || tickets[0]);
  const [agents, setAgents] = useState([]);
  const [reply, setReply] = useState("");
  const [file, setFile] = useState(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    api.get(`/tickets/${id}`).then(({ data }) => setTicket(data.data || data)).catch(() => {
      setTicket(demoStore.tickets().find((item) => item.id === id) || tickets.find((item) => item.id === id) || tickets[0]);
    });
    api.get("/reports/agents").then(({ data }) => setAgents(normalizeItems(data, []))).catch(() => setAgents(demoStore.users().filter((user) => user.role === "AGENT")));
  }, [id]);

  const updateTicket = async (data) => {
    try {
      const response = await api.put(`/tickets/${id}`, data);
      const updated = response.data.data || response.data;
      setTicket(updated);
      if (data.agentId !== undefined) setNotice(`Assigned to ${updated.agent?.name || "Unassigned"}`);
      if (data.status) setNotice(`Status changed to ${data.status}`);
    } catch {
      const agent = agents.find((item) => item.id === data.agentId);
      const updated = demoStore.updateTicket(id, { ...data, agentName: agent?.name || "Unassigned" });
      setTicket(updated);
      if (data.agentId !== undefined) setNotice(`Assigned to ${agent?.name || "Unassigned"}`);
      if (data.status) setNotice(`Status changed to ${data.status}`);
    }
  };

  const sendReply = async () => {
    if (!reply.trim() && !file) return;
    const filePayload = file ? await uploadFile(file) : {};
    try {
      const { data } = await api.post(`/tickets/${id}/reply`, { content: reply, ...filePayload });
      const message = data.data || data;
      setTicket((current) => ({ ...current, messages: [...(current.messages || []), message] }));
    } catch {
      const { ticket: updatedTicket } = demoStore.addTicketReply(id, { content: reply || filePayload.fileName, senderId: "admin", ...filePayload });
      setTicket(updatedTicket);
    }
    setReply("");
    setFile(null);
  };

  return (
    <>
      <PageHeader title={ticket.subject} description="Assign agents, change status, review timeline, and reply to the customer." />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card className="p-5">
            <TicketStatusBadge status={ticket.status} />
            <p className="mt-4 text-slate-700">{ticket.description}</p>
            <textarea className="mt-6 min-h-32 w-full rounded-md border border-slate-200 p-3" placeholder={t("ticketsUi.writeReply")} value={reply} onChange={(event) => setReply(event.target.value)} />
            <input type="file" className="mt-3 w-full rounded-md border border-dashed border-slate-300 p-3" onChange={(event) => setFile(event.target.files?.[0] || null)} />
            <Button className="mt-3" onClick={sendReply}>{t("buttons.sendReply")}</Button>
          </Card>
          <TicketTimeline ticket={ticket} />
        </div>
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3"><h2 className="font-semibold text-slate-950">{t("ticketsUi.workflow")}</h2>{notice ? <Badge tone="green">{notice}</Badge> : null}</div>
          <label className="mt-4 block">
            <span className="text-sm font-semibold text-slate-700">{t("table.status")}</span>
            <select className="mt-1 h-11 w-full rounded-md border border-slate-200 px-3" value={ticket.status || "OPEN"} onChange={(event) => updateTicket({ status: event.target.value })}>
              <option>OPEN</option><option>IN_PROGRESS</option><option>WAITING_CUSTOMER</option><option>RESOLVED</option><option>CLOSED</option>
            </select>
          </label>
          <label className="mt-4 block">
            <span className="text-sm font-semibold text-slate-700">{t("ticketsUi.assignAgent")}</span>
            <select className="mt-1 h-11 w-full rounded-md border border-slate-200 px-3" value={ticket.agentId || ""} onChange={(event) => updateTicket({ agentId: event.target.value || null })}>
              <option value="">{t("ticketsUi.unassigned")}</option>
              {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
            </select>
          </label>
          <dl className="mt-5 space-y-3 text-sm">
            <div><dt className="text-slate-500">Customer</dt><dd className="font-semibold">{ticket.customer?.name || ticket.customerName}</dd></div>
            <div><dt className="text-slate-500">Priority</dt><dd className="font-semibold">{ticket.priority}</dd></div>
            <div><dt className="text-slate-500">Category</dt><dd className="font-semibold">{ticket.category}</dd></div>
          </dl>
        </Card>
      </div>
    </>
  );
}
