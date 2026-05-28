import { useEffect, useMemo, useState } from "react";
import api, { uploadFile } from "../../api/axios.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import ChatSidebar from "../../components/chat/ChatSidebar.jsx";
import ChatWindow from "../../components/chat/ChatWindow.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useSocket } from "../../context/SocketContext.jsx";
import { normalizeItems } from "../../utils/helpers.js";
import Button from "../../components/common/Button.jsx";
import { useTranslation } from "react-i18next";
import { ArrowRightLeft, CheckCircle2, Monitor, ShieldCheck, UserCheck, Users } from "lucide-react";

const appendMessage = (current, chatId, message) => {
  const existing = current[chatId] || [];
  if (existing.some((item) => item.id === message.id)) return current;
  return { ...current, [chatId]: [...existing, message] };
};

export default function AgentLiveChats() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { socket, connected, pushNotification } = useSocket();
  const [sessions, setSessions] = useState([]);
  const [active, setActive] = useState(null);
  const [messagesByChat, setMessagesByChat] = useState({});
  const [typingUsers, setTypingUsers] = useState([]);
  const [agents, setAgents] = useState([]);
  const [transferAgentId, setTransferAgentId] = useState("");
  const [notice, setNotice] = useState("");
  const activeMessages = useMemo(() => active?.messages || [], [active]);
  const queueStats = {
    waiting: sessions.filter((session) => session.status === "WAITING").length,
    active: sessions.filter((session) => session.status === "ACTIVE").length,
    transferred: sessions.filter((session) => session.status === "TRANSFERRED").length,
  };

  useEffect(() => {
    api.get("/chats").then(({ data }) => {
      const rows = normalizeItems(data, []);
      setSessions(rows);
      setActive(rows[0] || null);
      setMessagesByChat(Object.fromEntries(rows.map((row) => [row.id, row.messages || []])));
    }).catch(() => {
      setSessions([]);
      setActive(null);
      setMessagesByChat({});
    });
    api.get("/reports/agents").then(({ data }) => setAgents(normalizeItems(data, []))).catch(() => setAgents([]));
  }, []);

  useEffect(() => {
    if (!socket || !active?.id) return undefined;
    socket.emit("join_chat", active.id);
    const receive = (message) => {
      if (message.chatSessionId !== active.id) return;
      setMessagesByChat((current) => appendMessage(current, active.id, message));
    };
    const chatUpdate = (chat) => {
      const updated = chat.chat || chat;
      setSessions((current) => {
        const exists = current.some((item) => item.id === updated.id);
        return exists ? current.map((item) => item.id === updated.id ? updated : item) : [updated, ...current];
      });
      if (updated.id === active.id) {
        setActive(updated);
        setMessagesByChat((current) => ({ ...current, [updated.id]: updated.messages || current[updated.id] || [] }));
      }
    };
    const typing = (payload) => payload.user?.id !== user?.id && setTypingUsers([payload.user]);
    const stopTyping = (payload) => payload.user?.id !== user?.id && setTypingUsers([]);
    socket.on("receive_message", receive);
    socket.on("agent_transfer", chatUpdate);
    socket.on("chat_queue_updated", chatUpdate);
    socket.on("typing", typing);
    socket.on("stop_typing", stopTyping);
    return () => {
      socket.emit("leave_chat", active.id);
      socket.off("receive_message", receive);
      socket.off("agent_transfer", chatUpdate);
      socket.off("chat_queue_updated", chatUpdate);
      socket.off("typing", typing);
      socket.off("stop_typing", stopTyping);
    };
  }, [socket, active?.id, user?.id]);

  const sendMessage = async ({ content, file }) => {
    if (!active?.id) return;
    let filePayload = {};
    if (file) filePayload = await uploadFile(file);
    const payload = { content: content || filePayload.fileName || "Attachment", ...filePayload, chatSessionId: active.id, senderId: user?.id, senderName: user?.name };
    if (connected) {
      socket.emit("send_message", payload, (response) => {
        if (!response?.success) {
          setNotice(response?.message || "Message failed.");
          return;
        }
        const { message, aiMessage } = response.data || {};
        setMessagesByChat((current) => {
          const withMessage = message ? appendMessage(current, active.id, message) : current;
          return aiMessage ? appendMessage(withMessage, active.id, aiMessage) : withMessage;
        });
      });
    } else {
      let message;
      let aiMessage;
      try {
        const { data } = await api.post(`/chats/${active.id}/message`, payload);
        message = data.data?.message || data.message || data.data || data;
        aiMessage = data.data?.aiMessage || data.aiMessage;
      } catch (error) {
        setNotice(error.friendlyMessage || "Message failed.");
        return;
      }
      setMessagesByChat((current) => {
        const withMessage = appendMessage(current, active.id, message);
        return aiMessage ? appendMessage(withMessage, active.id, aiMessage) : withMessage;
      });
      setSessions((current) => current.map((item) => item.id === active.id ? { ...item, lastMessage: (aiMessage || message)?.content, updatedAt: new Date().toISOString() } : item));
    }
  };

  const acceptChat = async () => {
    if (!active?.id) return;
    let chat;
    try {
      const { data } = await api.post(`/chats/${active.id}/accept`);
      chat = data.data || data;
    } catch (error) {
      setNotice(error.friendlyMessage || "Accept failed.");
      return;
    }
    setActive(chat);
    setSessions((current) => current.map((item) => item.id === chat.id ? chat : item));
    setNotice("Chat accepted. Customer can continue in real time.");
    pushNotification({ message: "Agent accepted a waiting chat.", type: "queue" });
  };

  const transferChat = async () => {
    if (!active?.id || !transferAgentId) return;
    let chat;
    try {
      const { data } = await api.post(`/chats/${active.id}/transfer`, { agentId: transferAgentId });
      chat = data.data || data;
    } catch (error) {
      setNotice(error.friendlyMessage || "Transfer failed.");
      return;
    }
    setActive(chat);
    setSessions((current) => current.map((item) => item.id === chat.id ? chat : item));
    setNotice("Chat transferred.");
    pushNotification({ message: "Chat transferred to another agent.", type: "transfer" });
  };

  const closeChat = async () => {
    if (!active?.id) return;
    let chat;
    try {
      const { data } = await api.put(`/chats/${active.id}/close`);
      chat = data.data || data;
    } catch (error) {
      setNotice(error.friendlyMessage || "Close failed.");
      return;
    }
    setActive(chat);
    setSessions((current) => current.map((item) => item.id === chat.id ? chat : item));
    setNotice("Chat closed and stored in history.");
    pushNotification({ message: "Chat closed and stored in history.", type: "chat" });
  };

  return (
    <>
      <PageHeader title="Live chat queue" description="Accept live chats, transfer conversations, view history, and send secure messages." />
      {notice ? <p className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{notice}</p> : null}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-h-[680px] flex-col overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-[0_16px_38px_rgba(15,23,42,0.06)] md:flex-row xl:h-[calc(100vh-12rem)] xl:min-h-[640px] xl:max-h-[860px]">
          <ChatSidebar sessions={sessions} activeId={active?.id} onSelect={setActive} />
          <ChatWindow
            session={active}
            messages={messagesByChat[active?.id] || activeMessages}
            currentUserId={user?.id}
            typingUsers={typingUsers}
            onTyping={() => socket?.emit("typing", { chatSessionId: active?.id, user })}
            onStopTyping={() => socket?.emit("stop_typing", { chatSessionId: active?.id, user })}
            onSend={sendMessage}
          />
        </div>
        <aside className="rounded-lg border border-slate-200/80 bg-white/94 p-5 shadow-[0_16px_38px_rgba(15,23,42,0.06)] xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-teal-50 text-teal-700 ring-1 ring-teal-100">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">{t("ticketsUi.workflow")}</h2>
              <p className="text-sm text-slate-500">Manage the selected conversation.</p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-md border border-amber-100 bg-amber-50 p-2 font-semibold text-amber-700"><p className="text-lg font-bold">{queueStats.waiting}</p><p>Waiting</p></div>
            <div className="rounded-md border border-emerald-100 bg-emerald-50 p-2 font-semibold text-emerald-700"><p className="text-lg font-bold">{queueStats.active}</p><p>Active</p></div>
            <div className="rounded-md border border-indigo-100 bg-indigo-50 p-2 font-semibold text-indigo-700"><p className="text-lg font-bold">{queueStats.transferred}</p><p>Transfers</p></div>
          </div>
          <Button className="mt-5 w-full" icon={CheckCircle2} onClick={acceptChat}>{t("buttons.accept")}</Button>
          <label className="mt-4 block">
            <span className="text-sm font-semibold text-slate-700">{t("chat.transferTo")}</span>
            <select className="mt-1 h-11 w-full rounded-md border border-slate-200 px-3" value={transferAgentId} onChange={(event) => setTransferAgentId(event.target.value)}>
              <option value="">{t("ticketsUi.unassigned")}</option>
              {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
            </select>
          </label>
          <Button variant="secondary" className="mt-3 w-full" icon={ArrowRightLeft} onClick={transferChat}>{t("buttons.transfer")}</Button>
          <Button variant="danger" className="mt-3 w-full" onClick={closeChat}>{t("buttons.close")}</Button>
          <div className="mt-5 border-t border-slate-200 pt-4">
            <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900"><Users className="h-4 w-4 text-teal-700" />Multi-agent support</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {agents.length ? agents.map((agent) => <span key={agent.id} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{agent.name}</span>) : <span className="text-sm text-slate-500">No agents loaded.</span>}
            </div>
          </div>
          <div className="mt-5 border-t border-slate-200 pt-4">
            <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900"><Monitor className="h-4 w-4 text-teal-700" />Visitor tracking</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between gap-3"><dt className="text-slate-500">Page</dt><dd className="truncate font-semibold text-slate-800">{active?.visitor?.page || "/support"}</dd></div>
              <div className="flex items-center justify-between gap-3"><dt className="text-slate-500">Device</dt><dd className="truncate font-semibold text-slate-800">{active?.visitor?.device || "Desktop Chrome"}</dd></div>
              <div className="flex items-center justify-between gap-3"><dt className="text-slate-500">Visits</dt><dd className="font-semibold text-slate-800">{active?.visitor?.visits || 1}</dd></div>
              <div className="flex items-center justify-between gap-3"><dt className="inline-flex items-center gap-1 text-slate-500"><ShieldCheck className="h-4 w-4" />Security</dt><dd className="font-semibold text-slate-800">Encrypted</dd></div>
            </dl>
          </div>
        </aside>
      </div>
    </>
  );
}
