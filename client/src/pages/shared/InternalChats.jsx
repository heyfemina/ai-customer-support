import { useEffect, useMemo, useState } from "react";
import { MessageSquare, Paperclip, Send } from "lucide-react";
import api, { uploadFile } from "../../api/axios.js";
import Button from "../../components/common/Button.jsx";
import Card from "../../components/common/Card.jsx";
import PageHeader from "../../components/common/PageHeader.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useSocket } from "../../context/SocketContext.jsx";
import { formatDate, normalizeItems, resolveFileUrl } from "../../utils/helpers.js";

export default function InternalChats() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [chats, setChats] = useState([]);
  const [agents, setAgents] = useState([]);
  const [active, setActive] = useState(null);
  const [message, setMessage] = useState("");
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({ subject: "", participantIds: [] });
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const activeMessages = useMemo(() => active?.messages || [], [active]);

  const load = () => {
    setLoading(true);
    setNotice("");
    api.get("/internal-chats").then(({ data }) => {
      const rows = normalizeItems(data, []);
      setChats(rows);
      setActive((current) => rows.find((row) => row.id === current?.id) || rows[0] || null);
    }).catch((error) => {
      setNotice(error.friendlyMessage || "Internal chats could not be loaded. Please check the backend API.");
    }).finally(() => setLoading(false));
    api.get("/reports/agents").then(({ data }) => setAgents(normalizeItems(data, []))).catch((error) => setNotice(error.friendlyMessage || "Agent list could not be loaded."));
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!socket || !active?.id) return undefined;
    socket.emit("join_internal_chat", active.id);
    const receive = (newMessage) => {
      if (newMessage.chatId !== active.id) return;
      setActive((current) => ({ ...current, messages: [...(current?.messages || []), newMessage] }));
      setChats((current) => current.map((chat) => chat.id === active.id ? { ...chat, messages: [...(chat.messages || []), newMessage] } : chat));
    };
    const refresh = () => load();
    socket.on("internal_message", receive);
    socket.on("internal_chat_updated", refresh);
    return () => {
      socket.emit("leave_internal_chat", active.id);
      socket.off("internal_message", receive);
      socket.off("internal_chat_updated", refresh);
    };
  }, [socket, active?.id]);

  const createChat = async () => {
    if (!form.subject.trim()) return;
    const { data } = await api.post("/internal-chats", form);
    const chat = data.data || data;
    setChats((current) => [chat, ...current]);
    setActive(chat);
    setForm({ subject: "", participantIds: [] });
  };

  const send = async () => {
    if (!active?.id || (!message.trim() && !file)) return;
    const filePayload = file ? await uploadFile(file) : {};
    const { data } = await api.post(`/internal-chats/${active.id}/message`, { content: message, ...filePayload });
    const saved = data.data || data;
    setActive((current) => ({ ...current, messages: [...(current?.messages || []), saved] }));
    setMessage("");
    setFile(null);
  };

  return (
    <>
      <PageHeader title="Internal communication" description="Admin and agents coordinate customer issues, ticket escalations, and handoffs in real time." />
      {notice ? <p className="mb-4 rounded-md border border-amber-100 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">{notice}</p> : null}
      <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="min-w-0 overflow-hidden rounded-lg">
          <div className="border-b border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-950">Conversations</h2>
            <p className="mt-1 text-sm text-slate-500">Admin and agent coordination threads.</p>
            <div className="mt-4 space-y-2">
              <input className="app-field" placeholder="Subject" value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} />
              {user?.role === "ADMIN" ? (
                <select className="app-field" value={form.participantIds[0] || ""} onChange={(event) => setForm({ ...form, participantIds: event.target.value ? [event.target.value] : [] })}>
                  <option value="">Select agent</option>
                  {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
                </select>
              ) : null}
              <Button className="w-full" icon={MessageSquare} onClick={createChat}>Start conversation</Button>
            </div>
          </div>
          <div className="app-scrollbar max-h-[640px] overflow-y-auto bg-slate-50 p-3">
            {chats.map((chat) => (
              <button key={chat.id} type="button" onClick={() => setActive(chat)} className={`mb-2 w-full rounded-lg border p-2.5 text-left shadow-sm transition hover:border-blue-200 hover:bg-white ${active?.id === chat.id ? "border-blue-300 bg-white ring-2 ring-blue-100" : "border-slate-200 bg-white"}`}>
                <div className="flex min-w-0 items-start justify-between gap-2">
                  <p className="min-w-0 truncate font-semibold text-slate-900">{chat.subject}</p>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">{chat.messages?.length || 0}</span>
                </div>
                <p className="mt-1 truncate text-xs text-slate-500">{chat.messages?.at(-1)?.content || "No messages yet"}</p>
                <p className="mt-2 truncate text-[11px] font-semibold text-slate-400">{formatDate(chat.updatedAt || chat.createdAt)}</p>
              </button>
            ))}
          </div>
        </Card>
        <Card className="flex min-h-[640px] min-w-0 flex-col overflow-hidden rounded-lg">
          {active ? (
            <>
              <div className="border-b border-slate-200 bg-white p-4">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold text-slate-950">{active.subject}</h2>
                    <p className="mt-1 truncate text-xs text-slate-500">{active.participants?.map((participant) => participant.user?.name).join(", ")}</p>
                  </div>
                  <span className="shrink-0 rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-100">{activeMessages.length} messages</span>
                </div>
              </div>
              <div className="app-scrollbar flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
                {activeMessages.map((item) => {
                  const mine = item.senderId === user?.id;
                  return (
                    <div key={item.id} className={`max-w-[82%] rounded-xl px-4 py-3 text-sm shadow-sm ${mine ? "ml-auto rounded-br-md border border-blue-200 bg-blue-50 text-slate-900" : "rounded-bl-md border border-slate-200 bg-white text-slate-700"}`}>
                      <p className="mb-1 text-xs font-bold">{mine ? "You" : item.sender?.name || "User"}</p>
                      <p className="whitespace-pre-wrap break-words">{item.content}</p>
                      {item.fileUrl ? <a className="mt-2 block truncate font-semibold underline" href={resolveFileUrl(item.fileUrl)} target="_blank" rel="noreferrer">{item.fileName || "Attachment"}</a> : null}
                      <p className={`mt-1 text-[11px] ${mine ? "text-blue-700" : "text-slate-400"}`}>{formatDate(item.createdAt)}</p>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-slate-200 p-3 sm:p-4">
                <div className="flex items-end gap-2">
                  <label className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700" title={file?.name || "Attach file"}>
                    <Paperclip className="h-4 w-4" />
                    <input type="file" className="hidden" onChange={(event) => setFile(event.target.files?.[0] || null)} />
                  </label>
                  <textarea className="app-field min-h-10 flex-1 resize-none rounded-lg py-2.5" placeholder={file?.name ? `Attached: ${file.name}` : "Message admin or agent"} value={message} onChange={(event) => setMessage(event.target.value)} />
                  <Button className="h-10 w-11 shrink-0 rounded-lg p-0" icon={Send} onClick={send} />
                </div>
              </div>
            </>
          ) : <div className="grid flex-1 place-items-center p-6 text-sm text-slate-500">Select or start a conversation.</div>}
        </Card>
      </div>
    </>
  );
}

