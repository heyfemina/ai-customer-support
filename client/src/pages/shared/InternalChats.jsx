import { useEffect, useMemo, useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import api, { uploadFile } from "../../api/axios.js";
import Button from "../../components/common/Button.jsx";
import Card from "../../components/common/Card.jsx";
import PageHeader from "../../components/common/PageHeader.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useSocket } from "../../context/SocketContext.jsx";
import { formatDate, normalizeItems } from "../../utils/helpers.js";

export default function InternalChats() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [chats, setChats] = useState([]);
  const [agents, setAgents] = useState([]);
  const [active, setActive] = useState(null);
  const [message, setMessage] = useState("");
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({ subject: "", participantIds: [] });
  const activeMessages = useMemo(() => active?.messages || [], [active]);

  const load = () => {
    api.get("/internal-chats").then(({ data }) => {
      const rows = normalizeItems(data, []);
      setChats(rows);
      setActive((current) => rows.find((row) => row.id === current?.id) || rows[0] || null);
    });
    api.get("/reports/agents").then(({ data }) => setAgents(normalizeItems(data, []))).catch(() => setAgents([]));
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
      <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
        <Card className="overflow-hidden">
          <div className="border-b border-slate-200 p-4">
            <h2 className="font-semibold text-slate-950">Conversations</h2>
            <div className="mt-3 space-y-2">
              <input className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm" placeholder="Subject" value={form.subject} onChange={(event) => setForm({ ...form, subject: event.target.value })} />
              {user?.role === "ADMIN" ? (
                <select className="h-10 w-full rounded-md border border-slate-200 px-3 text-sm" value={form.participantIds[0] || ""} onChange={(event) => setForm({ ...form, participantIds: event.target.value ? [event.target.value] : [] })}>
                  <option value="">Select agent</option>
                  {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
                </select>
              ) : null}
              <Button className="w-full" icon={MessageSquare} onClick={createChat}>Start conversation</Button>
            </div>
          </div>
          <div className="app-scrollbar max-h-[640px] overflow-y-auto p-3">
            {chats.map((chat) => (
              <button key={chat.id} type="button" onClick={() => setActive(chat)} className={`mb-2 w-full rounded-md border p-3 text-left ${active?.id === chat.id ? "border-teal-300 bg-teal-50" : "border-slate-200 bg-white"}`}>
                <p className="font-semibold text-slate-900">{chat.subject}</p>
                <p className="mt-1 truncate text-xs text-slate-500">{chat.messages?.at(-1)?.content || "No messages yet"}</p>
              </button>
            ))}
          </div>
        </Card>
        <Card className="flex min-h-[640px] flex-col overflow-hidden">
          {active ? (
            <>
              <div className="border-b border-slate-200 p-4">
                <h2 className="font-semibold text-slate-950">{active.subject}</h2>
                <p className="mt-1 text-xs text-slate-500">{active.participants?.map((participant) => participant.user?.name).join(", ")}</p>
              </div>
              <div className="app-scrollbar flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
                {activeMessages.map((item) => {
                  const mine = item.senderId === user?.id;
                  return (
                    <div key={item.id} className={`max-w-[78%] rounded-lg px-4 py-3 text-sm shadow-sm ${mine ? "ml-auto bg-teal-600 text-white" : "border border-slate-200 bg-white text-slate-700"}`}>
                      <p className="mb-1 text-xs font-bold">{item.sender?.name || "User"}</p>
                      <p className="whitespace-pre-wrap break-words">{item.content}</p>
                      {item.fileUrl ? <a className="mt-2 block font-semibold underline" href={item.fileUrl} target="_blank" rel="noreferrer">{item.fileName || "Attachment"}</a> : null}
                      <p className={`mt-1 text-[11px] ${mine ? "text-teal-100" : "text-slate-400"}`}>{formatDate(item.createdAt)}</p>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-slate-200 p-4">
                <textarea className="min-h-20 w-full rounded-md border border-slate-200 p-3 text-sm" placeholder="Message admin or agent" value={message} onChange={(event) => setMessage(event.target.value)} />
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <input type="file" className="min-w-0 flex-1 rounded-md border border-dashed border-slate-300 p-2 text-sm" onChange={(event) => setFile(event.target.files?.[0] || null)} />
                  <Button icon={Send} onClick={send}>Send</Button>
                </div>
              </div>
            </>
          ) : <div className="grid flex-1 place-items-center p-6 text-sm text-slate-500">Select or start a conversation.</div>}
        </Card>
      </div>
    </>
  );
}
