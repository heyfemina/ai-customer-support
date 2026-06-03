import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import Card from "../../components/common/Card.jsx";
import Button from "../../components/common/Button.jsx";
import TicketStatusBadge from "../../components/tickets/TicketStatusBadge.jsx";
import TicketTimeline from "../../components/tickets/TicketTimeline.jsx";
import AttachmentPreview from "../../components/common/AttachmentPreview.jsx";
import { formatDate } from "../../utils/helpers.js";

export default function AgentTicketDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [reply, setReply] = useState("");
  const [file, setFile] = useState(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    api.get(`/tickets/${id}`).then(({ data }) => setTicket(data.data || data)).catch(() => {
      setTicket(null);
    });
  }, [id]);

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
    setNotice("Reply sent to the customer.");
  };

  const changeStatus = async (status) => {
    try {
      const { data } = await api.put(`/tickets/${id}/status`, { status });
      setTicket(data.data || data);
    } catch {
      setNotice("Status update failed. Please check the API connection.");
    }
    setNotice(`Ticket status changed to ${status}.`);
  };

  const openTicketChat = async () => {
    const { data } = await api.post(`/chats/ticket/${id}/start`);
    const chat = data.data || data;
    navigate("/agent/live-chats", { state: { chatId: chat.id } });
  };

  return (
    <>
      {!ticket ? <Card className="p-8 text-center text-sm text-slate-500">Ticket not loaded. Please check the API connection.</Card> : (
      <>
      <PageHeader title={ticket.subject} description="Ticket details, customer profile, reply timeline, attachments, and status controls." actions={<><Button variant="secondary" onClick={openTicketChat}>Chat with customer</Button><Button variant="secondary" onClick={() => changeStatus("IN_PROGRESS")}>In progress</Button><Button onClick={() => changeStatus("RESOLVED")}>Mark resolved</Button></>} />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6"><Card className="p-5">{notice ? <p className="mb-4 rounded-md border border-green-100 bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">{notice}</p> : null}<div className="flex flex-wrap items-center justify-between gap-3"><TicketStatusBadge status={ticket.status} /><select className="app-field max-w-48 text-sm font-semibold" value={ticket.status || "OPEN"} onChange={(event) => changeStatus(event.target.value)}><option>OPEN</option><option>IN_PROGRESS</option><option>WAITING_CUSTOMER</option><option>RESOLVED</option><option>CLOSED</option></select></div><p className="mt-4 leading-7 text-slate-700">{ticket.description}</p><div className="mt-5 border-t border-slate-200 pt-5"><h2 className="mb-3 font-semibold text-slate-950">Uploaded attachments</h2><AttachmentPreview attachments={ticket.attachments || []} /></div><textarea className="app-field mt-6 min-h-36" placeholder="Write a customer reply" value={reply} onChange={(event) => setReply(event.target.value)} /><input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx" className="mt-3 w-full rounded-md border border-dashed border-slate-300 bg-slate-50 p-3 text-sm" onChange={(event) => setFile(event.target.files?.[0] || null)} />{file ? <p className="mt-2 text-sm font-semibold text-slate-500">Selected: {file.name}</p> : null}<Button className="mt-3" onClick={sendReply}>Send reply</Button></Card><TicketTimeline ticket={ticket} /></div>
        <div className="space-y-6">
          <Card className="p-5"><h2 className="font-semibold text-slate-950">Customer details</h2><dl className="mt-4 space-y-3 text-sm"><div className="rounded-md bg-slate-50 p-3"><dt className="text-slate-500">Name</dt><dd className="font-semibold">{ticket.customer?.name || ticket.customerName}</dd><dd className="text-xs text-slate-500">{ticket.customer?.email}</dd></div><div className="rounded-md bg-slate-50 p-3"><dt className="text-slate-500">Ticket ID</dt><dd className="font-mono font-semibold">{ticket.id}</dd></div><div className="rounded-md bg-slate-50 p-3"><dt className="text-slate-500">Priority</dt><dd className="font-semibold">{ticket.priority}</dd></div><div className="rounded-md bg-slate-50 p-3"><dt className="text-slate-500">Category</dt><dd className="font-semibold">{ticket.category}</dd></div><div className="rounded-md bg-slate-50 p-3"><dt className="text-slate-500">Assigned agent</dt><dd className="font-semibold">{ticket.agent?.name || ticket.agentName || "Unassigned"}</dd></div><div className="rounded-md bg-slate-50 p-3"><dt className="text-slate-500">Created</dt><dd className="font-semibold">{formatDate(ticket.createdAt)}</dd></div><div className="rounded-md bg-slate-50 p-3"><dt className="text-slate-500">Response time</dt><dd className="font-semibold">{ticket.firstResponseMinutes ? `${ticket.firstResponseMinutes} minutes` : "Pending"}</dd></div><div className="rounded-md bg-slate-50 p-3"><dt className="text-slate-500">Resolution time</dt><dd className="font-semibold">{ticket.resolutionMinutes ? `${ticket.resolutionMinutes} minutes` : "Pending"}</dd></div></dl></Card>
          <Card className="p-5">
            <h2 className="font-semibold text-slate-950">Customer feedback</h2>
            {ticket.feedbackRating ? <p className="mt-3 text-sm font-semibold text-slate-700">Rating: {ticket.feedbackRating}/5</p> : <p className="mt-3 text-sm text-slate-500">No feedback submitted yet.</p>}
            {ticket.feedbackText ? <p className="mt-2 rounded-md bg-slate-50 p-3 text-sm text-slate-700">{ticket.feedbackText}</p> : null}
            {ticket.complaintStatus && ticket.complaintStatus !== "NONE" ? <div className="mt-4 rounded-md border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800"><p className="font-semibold">Complaint: {ticket.complaintStatus}</p><p className="mt-2">{ticket.complaintText}</p></div> : null}
          </Card>
        </div>
      </div>
      </>
      )}
    </>
  );
}
