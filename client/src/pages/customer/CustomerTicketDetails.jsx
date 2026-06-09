import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import Card from "../../components/common/Card.jsx";
import Button from "../../components/common/Button.jsx";
import TicketStatusBadge from "../../components/tickets/TicketStatusBadge.jsx";
import TicketTimeline from "../../components/tickets/TicketTimeline.jsx";
import AttachmentPreview from "../../components/common/AttachmentPreview.jsx";
import { formatDate } from "../../utils/helpers.js";

export default function CustomerTicketDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [reply, setReply] = useState("");
  const [file, setFile] = useState(null);
  const [feedback, setFeedback] = useState({ rating: 5, feedbackText: "" });
  const [complaint, setComplaint] = useState({ complaintSubject: "", complaintText: "" });
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const loadTicket = useCallback(() => {
    return api.get(`/tickets/${id}`).then(({ data }) => setTicket(data.data || data));
  }, [id]);

  useEffect(() => {
    setLoading(true);
    setLoadError("");
    loadTicket().catch((error) => {
      setTicket(null);
      setLoadError(error.friendlyMessage || "Ticket details could not be loaded. Please check the API connection.");
    }).finally(() => setLoading(false));
  }, [loadTicket]);

  const sendReply = async () => {
    if (!reply.trim() && !file) return;
    try {
      const payload = new FormData();
      payload.append("content", reply);
      if (file) payload.append("attachments", file);
      await api.post(`/tickets/${id}/reply`, payload, { headers: { "Content-Type": "multipart/form-data" } });
      await loadTicket();
      setNotice("Reply added to the ticket.");
    } catch (error) {
      setNotice(error.friendlyMessage || "Reply failed. Please check the API connection.");
    }
    setReply("");
    setFile(null);
  };

  const submitFeedback = async () => {
    try {
      const { data } = await api.post(`/tickets/${id}/feedback`, feedback);
      setTicket(data.data || data);
      setNotice("Feedback submitted to the agent and admin.");
    } catch (error) {
      setNotice(error.friendlyMessage || "Feedback failed.");
    }
  };

  const submitComplaint = async () => {
    if (!complaint.complaintText.trim()) {
      setNotice("Please describe the complaint before sending.");
      return;
    }
    try {
      const { data } = await api.post(`/tickets/${id}/complaint`, complaint);
      setTicket(data.data || data);
      setComplaint({ complaintSubject: "", complaintText: "" });
      setNotice("Complaint sent to admin.");
    } catch (error) {
      setNotice(error.friendlyMessage || "Complaint failed.");
    }
  };

  const openTicketChat = async () => {
    const { data } = await api.post(`/chats/ticket/${id}/start`);
    const chat = data.data || data;
    navigate("/customer/live-chat", { state: { chatId: chat.id } });
  };

  if (loading) return <Card className="p-8 text-center text-sm font-semibold text-slate-500">No records found</Card>;
  if (!ticket) return <Card className="p-8 text-center text-sm text-slate-500">{loadError || "Ticket not loaded. Please check the API connection."}</Card>;

  return (
    <>
      <PageHeader title={ticket.subject} description="Track status, communicate with support, submit feedback, and raise complaints." actions={<Button onClick={openTicketChat}>Chat about this ticket</Button>} />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            {notice ? <p className="mb-4 rounded-md border border-green-100 bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">{notice}</p> : null}
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Support request</p>
                <h2 className="mt-1 font-semibold text-slate-950">{ticket.subject}</h2>
              </div>
              <TicketStatusBadge status={ticket.status} />
            </div>
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3"><p className="text-slate-500">Ticket ID</p><p className="break-all font-mono font-semibold text-slate-950">{ticket.id}</p></div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3"><p className="text-slate-500">Created</p><p className="font-semibold text-slate-950">{formatDate(ticket.createdAt)}</p></div>
            </div>
            <p className="mt-4 leading-7 text-slate-700">{ticket.description}</p>
            {ticket.status === "RESOLUTION_PROPOSED" ? (
              <div className="mt-4 rounded-md border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800">
                <p className="font-semibold">The support agent has provided a solution. If the issue is still not solved, please reply within 48 hours. If no reply is received, the ticket will be closed automatically.</p>
              </div>
            ) : null}
            <div className="mt-5 border-t border-slate-200 pt-5">
              <h2 className="mb-3 font-semibold text-slate-950">Uploaded attachments</h2>
              <AttachmentPreview attachments={ticket.attachments || []} />
            </div>
            <textarea className="app-field mt-6 min-h-32" placeholder="Add a reply" value={reply} onChange={(event) => setReply(event.target.value)} />
            <input type="file" accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx" className="app-upload mt-3" onChange={(event) => setFile(event.target.files?.[0] || null)} />
            {file ? <p className="mt-2 text-sm font-semibold text-slate-500">Selected: {file.name}</p> : null}
            <Button className="mt-3" onClick={sendReply}>Send reply</Button>
          </Card>
          <TicketTimeline ticket={ticket} />
        </div>
        <div className="space-y-6 lg:sticky lg:top-24">
          <Card className="p-5 sm:p-6">
            <h2 className="border-b border-slate-100 pb-4 font-semibold text-slate-950">Ticket summary</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3"><dt className="text-slate-500">Priority</dt><dd className="font-semibold text-slate-950">{ticket.priority}</dd></div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3"><dt className="text-slate-500">Category</dt><dd className="font-semibold text-slate-950">{ticket.category}</dd></div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3"><dt className="text-slate-500">Assigned agent</dt><dd className="font-semibold text-slate-950">{ticket.agent?.name || "Unassigned"}</dd><dd className="truncate text-xs text-slate-500">{ticket.agent?.email}</dd></div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3"><dt className="text-slate-500">Last updated</dt><dd className="font-semibold text-slate-950">{formatDate(ticket.updatedAt)}</dd></div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3"><dt className="text-slate-500">Resolution time</dt><dd className="font-semibold text-slate-950">{ticket.resolutionMinutes ? `${ticket.resolutionMinutes} minutes` : "Pending"}</dd></div>
            </dl>
          </Card>
          <Card className="p-5 sm:p-6">
            <h2 className="font-semibold text-slate-950">Agent feedback</h2>
            <label className="mt-4 block">
              <span className="app-label">Rating</span>
              <select className="app-field mt-1" value={feedback.rating} onChange={(event) => setFeedback({ ...feedback, rating: Number(event.target.value) })}>
                <option value={5}>5 - Excellent</option>
                <option value={4}>4 - Good</option>
                <option value={3}>3 - Average</option>
                <option value={2}>2 - Poor</option>
                <option value={1}>1 - Very poor</option>
              </select>
            </label>
            <textarea className="app-field mt-3 min-h-24" placeholder="Feedback for the agent" value={feedback.feedbackText} onChange={(event) => setFeedback({ ...feedback, feedbackText: event.target.value })} />
            <Button className="mt-3 w-full" onClick={submitFeedback}>Submit feedback</Button>
            {ticket.feedbackRating ? <p className="mt-3 text-sm font-semibold text-slate-600">Current feedback: {ticket.feedbackRating}/5</p> : null}
          </Card>
          <Card className="p-5 sm:p-6">
            <h2 className="font-semibold text-slate-950">Complaint to admin</h2>
            <input className="app-field mt-4" placeholder="Complaint subject" value={complaint.complaintSubject} onChange={(event) => setComplaint({ ...complaint, complaintSubject: event.target.value })} />
            <textarea className="app-field mt-3 min-h-24" placeholder="Explain the issue with response quality or delay" value={complaint.complaintText} onChange={(event) => setComplaint({ ...complaint, complaintText: event.target.value })} />
            <Button className="mt-3 w-full" variant="secondary" onClick={submitComplaint}>Send complaint</Button>
            {ticket.complaintStatus !== "NONE" ? (
              <div className="mt-4 rounded-md border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800">
                <p className="font-semibold">Complaint status: {ticket.complaintStatus}</p>
                {ticket.complaintAdminReply ? <p className="mt-2">{ticket.complaintAdminReply}</p> : null}
              </div>
            ) : null}
          </Card>
        </div>
      </div>
    </>
  );
}
