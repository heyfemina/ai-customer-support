import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import Card from "../../components/common/Card.jsx";
import Button from "../../components/common/Button.jsx";
import TicketStatusBadge from "../../components/tickets/TicketStatusBadge.jsx";
import TicketTimeline from "../../components/tickets/TicketTimeline.jsx";
import AttachmentPreview from "../../components/common/AttachmentPreview.jsx";
import { formatDate, normalizeItems } from "../../utils/helpers.js";
import Badge from "../../components/common/Badge.jsx";
import { useTranslation } from "react-i18next";

export default function AdminTicketDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [ticket, setTicket] = useState(null);
  const [agents, setAgents] = useState([]);
  const [reply, setReply] = useState("");
  const [file, setFile] = useState(null);
  const [complaintReply, setComplaintReply] = useState("");
  const [complaintStatus, setComplaintStatus] = useState("UNDER_REVIEW");
  const [complaintAction, setComplaintAction] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    api.get(`/tickets/${id}`).then(({ data }) => setTicket(data.data || data)).catch(() => {
      setTicket(null);
    });
    api.get("/reports/agents").then(({ data }) => setAgents(normalizeItems(data, []))).catch(() => setAgents([]));
  }, [id]);

  const updateTicket = async (data) => {
    try {
      const response = await api.put(`/tickets/${id}`, data);
      const updated = response.data.data || response.data;
      setTicket(updated);
      if (data.agentId !== undefined) setNotice(`Assigned to ${updated.agent?.name || "Unassigned"}`);
      if (data.status) setNotice(`Status changed to ${data.status}`);
    } catch {
      setNotice("Ticket update failed. Please check the API connection.");
    }
  };

  const sendReply = async () => {
    if (!reply.trim() && !file) return;
    try {
      const payload = new FormData();
      payload.append("content", reply);
      if (file) payload.append("attachments", file);
      const { data } = await api.post(`/tickets/${id}/reply`, payload, { headers: { "Content-Type": "multipart/form-data" } });
      const message = data.data || data;
      setTicket((current) => ({ ...current, messages: [...(current.messages || []), message] }));
    } catch {
      setNotice("Reply failed. Please check the API connection.");
    }
    setReply("");
    setFile(null);
  };

  const replyComplaint = async () => {
    if (!complaintReply.trim()) {
      setNotice("Write an admin reply before saving.");
      return;
    }
    try {
      const { data } = await api.post(`/tickets/${id}/complaint/reply`, { reply: complaintReply, status: complaintStatus, actionTaken: complaintAction });
      setTicket(data.data || data);
      setComplaintReply("");
      setComplaintAction("");
      setNotice("Complaint reply saved.");
    } catch (error) {
      setNotice(error.friendlyMessage || "Complaint reply failed.");
    }
  };

  const openTicketChat = async () => {
    const { data } = await api.post(`/chats/ticket/${id}/start`);
    const chat = data.data || data;
    navigate("/admin/chats", { state: { chatId: chat.id } });
  };

  return (
    <>
      {!ticket ? <Card className="p-8 text-center text-sm text-slate-500">Ticket not loaded. Please check the API connection.</Card> : (
      <>
      <PageHeader title={ticket.subject} description="Assign agents, change status, review timeline, and reply to the customer." actions={<Button onClick={openTicketChat}>Open live chat with customer</Button>} />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card className="p-5">
            <TicketStatusBadge status={ticket.status} />
            <p className="mt-4 text-slate-700">{ticket.description}</p>
            <div className="mt-5 border-t border-slate-200 pt-5">
              <h2 className="mb-3 font-semibold text-slate-950">Uploaded attachments</h2>
              <AttachmentPreview attachments={ticket.attachments || []} />
            </div>
            <textarea className="mt-6 min-h-32 w-full rounded-md border border-slate-200 p-3" placeholder={t("ticketsUi.writeReply")} value={reply} onChange={(event) => setReply(event.target.value)} />
            <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx" className="mt-3 w-full rounded-md border border-dashed border-slate-300 p-3" onChange={(event) => setFile(event.target.files?.[0] || null)} />
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
            <div className="rounded-md bg-slate-50 p-3"><dt className="text-slate-500">Customer</dt><dd className="font-semibold">{ticket.customer?.name || ticket.customerName}</dd><dd className="text-xs text-slate-500">{ticket.customer?.email}</dd></div>
            <div className="rounded-md bg-slate-50 p-3"><dt className="text-slate-500">Assigned agent</dt><dd className="font-semibold">{ticket.agent?.name || "Unassigned"}</dd><dd className="text-xs text-slate-500">{ticket.agent?.email}</dd></div>
            <div className="rounded-md bg-slate-50 p-3"><dt className="text-slate-500">Ticket ID</dt><dd className="font-mono font-semibold">{ticket.id}</dd></div>
            <div className="rounded-md bg-slate-50 p-3"><dt className="text-slate-500">Assignment</dt><dd className="font-semibold">{ticket.assignmentMode || "UNASSIGNED"}</dd><dd className="text-xs text-slate-500">{ticket.assignedAt ? formatDate(ticket.assignedAt) : "Not assigned"}</dd></div>
            <div className="rounded-md bg-slate-50 p-3"><dt className="text-slate-500">Priority</dt><dd className="font-semibold">{ticket.priority}</dd></div>
            <div className="rounded-md bg-slate-50 p-3"><dt className="text-slate-500">Category</dt><dd className="font-semibold">{ticket.category}</dd></div>
            <div className="rounded-md bg-slate-50 p-3"><dt className="text-slate-500">Created</dt><dd className="font-semibold">{formatDate(ticket.createdAt)}</dd></div>
            <div className="rounded-md bg-slate-50 p-3"><dt className="text-slate-500">First response</dt><dd className="font-semibold">{ticket.firstResponseMinutes ? `${ticket.firstResponseMinutes} minutes` : "Pending"}</dd></div>
            <div className="rounded-md bg-slate-50 p-3"><dt className="text-slate-500">Resolution time</dt><dd className="font-semibold">{ticket.resolutionMinutes ? `${ticket.resolutionMinutes} minutes` : "Pending"}</dd></div>
          </dl>
          <div className="mt-5 border-t border-slate-200 pt-5">
            <h3 className="font-semibold text-slate-950">Feedback</h3>
            {ticket.feedbackRating ? <p className="mt-2 text-sm font-semibold text-slate-700">{ticket.feedbackRating}/5 from customer</p> : <p className="mt-2 text-sm text-slate-500">No customer feedback yet.</p>}
            {ticket.feedbackText ? <p className="mt-2 rounded-md bg-slate-50 p-3 text-sm text-slate-700">{ticket.feedbackText}</p> : null}
          </div>
          {ticket.complaintStatus && ticket.complaintStatus !== "NONE" ? (
            <div className="mt-5 border-t border-slate-200 pt-5">
              <h3 className="font-semibold text-slate-950">Customer complaint</h3>
              <div className="mt-3 rounded-md border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800">
                <p className="font-semibold">{ticket.complaintSubject || "Ticket complaint"} - {ticket.complaintStatus}</p>
                <p className="mt-2">{ticket.complaintText}</p>
                {ticket.complaintAdminReply ? <p className="mt-3 border-t border-amber-200 pt-3"><span className="font-semibold">Admin reply:</span> {ticket.complaintAdminReply}</p> : null}
              </div>
              <textarea className="app-field mt-3 min-h-24" placeholder="Reply to customer and record admin action" value={complaintReply} onChange={(event) => setComplaintReply(event.target.value)} />
              <select className="app-field mt-3" value={complaintStatus} onChange={(event) => setComplaintStatus(event.target.value)}>
                <option>UNDER_REVIEW</option>
                <option>ACTION_TAKEN</option>
                <option>RESOLVED</option>
                <option>REJECTED</option>
              </select>
              <textarea className="app-field mt-3 min-h-20" placeholder="Action taken with agent or internal note" value={complaintAction} onChange={(event) => setComplaintAction(event.target.value)} />
              <Button className="mt-3 w-full" onClick={replyComplaint}>Save complaint reply</Button>
            </div>
          ) : null}
        </Card>
      </div>
      </>
      )}
    </>
  );
}
