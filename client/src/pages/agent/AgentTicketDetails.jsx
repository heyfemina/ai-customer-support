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
import { useAuth } from "../../context/AuthContext.jsx";

export default function AgentTicketDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
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

  const claimTicket = async () => {
    try {
      const { data } = await api.post(`/tickets/${id}/claim`);
      setTicket(data.data || data);
      setNotice("Ticket claimed. You can now work on it.");
    } catch (error) {
      setNotice(error.friendlyMessage || "Ticket could not be claimed.");
    }
  };

  const proposeResolution = async () => {
    try {
      const { data } = await api.post(`/tickets/${id}/propose-resolution`);
      setTicket(data.data || data);
      setNotice("Resolution proposed. The customer can reply within 48 hours.");
    } catch (error) {
      setNotice(error.friendlyMessage || "Resolution proposal failed.");
    }
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
      <PageHeader title={ticket.subject} description="Ticket details, customer profile, reply timeline, attachments, and status controls." actions={<><Button variant="secondary" onClick={openTicketChat}>Chat with customer</Button>{!ticket.agentId ? <Button onClick={claimTicket}>Accept / Claim</Button> : null}<Button variant="secondary" disabled={ticket.agentId !== user?.id} onClick={() => changeStatus("IN_PROGRESS")}>In progress</Button><Button disabled={ticket.agentId !== user?.id} onClick={proposeResolution}>Propose Resolution</Button></>} />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6"><Card className="p-5 sm:p-6">{notice ? <p className="mb-4 rounded-md border border-green-100 bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">{notice}</p> : null}<div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Assigned ticket</p><h2 className="mt-1 font-semibold text-slate-950">{ticket.subject}</h2></div><div className="flex flex-wrap items-center gap-2"><TicketStatusBadge status={ticket.status} /><select className="app-field max-w-48 text-sm font-semibold" value={ticket.status || "OPEN"} onChange={(event) => changeStatus(event.target.value)} disabled={ticket.agentId !== user?.id}><option>OPEN</option><option>IN_PROGRESS</option><option>WAITING_CUSTOMER</option><option>RESOLUTION_PROPOSED</option><option>REOPENED</option></select></div></div><p className="mt-4 leading-7 text-slate-700">{ticket.description}</p><div className="mt-5 border-t border-slate-200 pt-5"><h2 className="mb-3 font-semibold text-slate-950">Uploaded attachments</h2><AttachmentPreview attachments={ticket.attachments || []} /></div>{ticket.agentId !== user?.id ? <p className="mt-5 rounded-md border border-amber-100 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">Claim this ticket before replying or changing status.</p> : null}<textarea className="app-field mt-6 min-h-36" placeholder="Write a customer reply" value={reply} onChange={(event) => setReply(event.target.value)} disabled={ticket.agentId !== user?.id} /><input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx" className="app-upload mt-3" onChange={(event) => setFile(event.target.files?.[0] || null)} disabled={ticket.agentId !== user?.id} />{file ? <p className="mt-2 text-sm font-semibold text-slate-500">Selected: {file.name}</p> : null}<Button className="mt-3" onClick={sendReply} disabled={ticket.agentId !== user?.id}>Send reply</Button></Card><TicketTimeline ticket={ticket} /></div>
        <div className="space-y-6">
          <Card className="p-5 sm:p-6"><h2 className="border-b border-slate-100 pb-4 font-semibold text-slate-950">Customer details</h2><dl className="mt-4 space-y-3 text-sm"><div className="rounded-md border border-slate-200 bg-slate-50 p-3"><dt className="text-slate-500">Name</dt><dd className="font-semibold text-slate-950">{ticket.customer?.name || ticket.customerName}</dd><dd className="truncate text-xs text-slate-500">{ticket.customer?.email}</dd></div><div className="rounded-md border border-slate-200 bg-slate-50 p-3"><dt className="text-slate-500">Ticket ID</dt><dd className="break-all font-mono font-semibold text-slate-950">{ticket.id}</dd></div><div className="rounded-md border border-slate-200 bg-slate-50 p-3"><dt className="text-slate-500">Priority</dt><dd className="font-semibold text-slate-950">{ticket.priority}</dd></div><div className="rounded-md border border-slate-200 bg-slate-50 p-3"><dt className="text-slate-500">Category</dt><dd className="font-semibold text-slate-950">{ticket.category}</dd></div><div className="rounded-md border border-slate-200 bg-slate-50 p-3"><dt className="text-slate-500">Assigned agent</dt><dd className="font-semibold text-slate-950">{ticket.agent?.name || ticket.agentName || "Unassigned"}</dd></div><div className="rounded-md border border-slate-200 bg-slate-50 p-3"><dt className="text-slate-500">Created</dt><dd className="font-semibold text-slate-950">{formatDate(ticket.createdAt)}</dd></div><div className="rounded-md border border-slate-200 bg-slate-50 p-3"><dt className="text-slate-500">Response time</dt><dd className="font-semibold text-slate-950">{ticket.firstResponseMinutes ? `${ticket.firstResponseMinutes} minutes` : "Pending"}</dd></div><div className="rounded-md border border-slate-200 bg-slate-50 p-3"><dt className="text-slate-500">Resolution time</dt><dd className="font-semibold text-slate-950">{ticket.resolutionMinutes ? `${ticket.resolutionMinutes} minutes` : "Pending"}</dd></div></dl></Card>
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
