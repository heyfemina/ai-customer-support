import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api, { uploadFile } from "../../api/axios.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import Card from "../../components/common/Card.jsx";
import Button from "../../components/common/Button.jsx";
import TicketStatusBadge from "../../components/tickets/TicketStatusBadge.jsx";
import TicketTimeline from "../../components/tickets/TicketTimeline.jsx";

export default function CustomerTicketDetails() {
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
    const filePayload = file ? await uploadFile(file) : {};
    try {
      const { data } = await api.post(`/tickets/${id}/reply`, { content: reply, ...filePayload });
      const message = data.data || data;
      setTicket((current) => ({ ...current, messages: [...(current.messages || []), message] }));
    } catch {
      setNotice("Reply failed. Please check the API connection.");
    }
    setReply("");
    setFile(null);
    setNotice("Reply added to the ticket.");
  };
  const openTicketChat = async () => {
    const { data } = await api.post(`/chats/ticket/${id}/start`);
    const chat = data.data || data;
    navigate("/customer/live-chat", { state: { chatId: chat.id } });
  };
  return (
    <>
      {!ticket ? <Card className="p-8 text-center text-sm text-slate-500">Ticket not loaded. Please check the API connection.</Card> : (
      <>
      <PageHeader title={ticket.subject} description="Ticket tracking, details, chat history, feedback, and support replies." actions={<Button onClick={openTicketChat}>Chat about this ticket</Button>} />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6"><Card className="p-5">{notice ? <p className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{notice}</p> : null}<TicketStatusBadge status={ticket.status} /><p className="mt-4 text-slate-700">{ticket.description}</p><textarea className="mt-6 min-h-32 w-full rounded-md border border-slate-200 p-3" placeholder="Add a reply" value={reply} onChange={(event) => setReply(event.target.value)} /><input type="file" className="mt-3 w-full rounded-md border border-dashed border-slate-300 p-3" onChange={(event) => setFile(event.target.files?.[0] || null)} />{file ? <p className="mt-2 text-sm font-semibold text-slate-500">Selected: {file.name}</p> : null}<Button className="mt-3" onClick={sendReply}>Send reply</Button></Card><TicketTimeline ticket={ticket} /></div>
        <Card className="p-5"><h2 className="font-semibold text-slate-950">Ticket summary</h2><dl className="mt-4 space-y-3 text-sm"><div><dt className="text-slate-500">Priority</dt><dd className="font-semibold">{ticket.priority}</dd></div><div><dt className="text-slate-500">Category</dt><dd className="font-semibold">{ticket.category}</dd></div><div><dt className="text-slate-500">Assigned agent</dt><dd className="font-semibold">{ticket.agent?.name || ticket.agentName || "Unassigned"}</dd></div></dl></Card>
      </div>
      </>
      )}
    </>
  );
}
