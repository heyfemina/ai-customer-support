import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import api, { uploadFile } from "../../api/axios.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import ChatSidebar from "../../components/chat/ChatSidebar.jsx";
import ChatWindow from "../../components/chat/ChatWindow.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useSocket } from "../../context/SocketContext.jsx";
import { mergeMessages, normalizeItems, sortByRecent, visitorDevice, visitorPage } from "../../utils/helpers.js";
import Button from "../../components/common/Button.jsx";
import { useTranslation } from "react-i18next";
import { ArrowRightLeft } from "lucide-react";

const appendMessage = (current, chatId, message) => {
  const existing = current[chatId] || [];
  if (existing.some((item) => item.id === message.id)) return current;
  return { ...current, [chatId]: [...existing, message] };
};

export default function Chats() {
  const location = useLocation();
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
  const [noticeTone, setNoticeTone] = useState("amber");
  const [actionLoading, setActionLoading] = useState("");
  const activeMessages = useMemo(() => active?.messages || [], [active]);
  const preferredChatId = location.state?.chatId;
  const queueStats = {
    waiting: sessions.filter((session) => session.status === "WAITING").length,
    active: sessions.filter((session) => ["ASSIGNED", "ACTIVE"].includes(session.status)).length,
    closed: sessions.filter((session) => session.status === "CLOSED").length,
  };
  const activeClosed = active?.status === "CLOSED";
  const actionBusy = Boolean(actionLoading);
  const noticeClass = {
    emerald: "border-green-100 bg-green-50 text-green-700",
    amber: "border-amber-100 bg-amber-50 text-amber-800",
    rose: "border-red-100 bg-red-50 text-red-700",
  }[noticeTone] || "border-slate-200 bg-slate-50 text-slate-700";

  const showNotice = (message, tone = "amber") => {
    setNotice(message);
    setNoticeTone(tone);
  };

  const selectSession = (session) => {
    setActive(session);
    setTransferAgentId("");
    setNotice("");
  };

  const loadChats = () =>
    api.get("/chats").then(({ data }) => {
      const rows = sortByRecent(normalizeItems(data, []));
      setSessions(rows);
      setActive((current) => rows.find((row) => row.id === (preferredChatId || current?.id)) || rows[0] || null);
      setMessagesByChat(Object.fromEntries(rows.map((row) => [row.id, row.messages || []])));
    }).catch(() => {
      setSessions([]);
      setActive(null);
      setMessagesByChat({});
    });

  useEffect(() => {
    loadChats();
    api.get("/reports/agents").then(({ data }) => setAgents(normalizeItems(data, []))).catch(() => setAgents([]));
  }, [preferredChatId]);

  useEffect(() => {
    if (!socket) return undefined;
    const chatUpdate = (chat) => {
      const updated = chat.chat || chat;
      if (!updated?.id) {
        loadChats();
        return;
      }
      setSessions((current) => {
        const exists = current.some((item) => item.id === updated.id);
        const next = exists ? current.map((item) => item.id === updated.id ? { ...updated, messages: mergeMessages(item.messages, updated.messages) } : item) : [updated, ...current];
        return sortByRecent(next);
      });
      setActive((current) => current?.id === updated.id ? { ...updated, messages: mergeMessages(current.messages, updated.messages) } : current);
      setMessagesByChat((current) => ({ ...current, [updated.id]: mergeMessages(current[updated.id], updated.messages) }));
    };
    socket.on("chat_queue_updated", chatUpdate);
    socket.on("agent_transfer", chatUpdate);
    socket.on("chat_notification", loadChats);
    return () => {
      socket.off("chat_queue_updated", chatUpdate);
      socket.off("agent_transfer", chatUpdate);
      socket.off("chat_notification", loadChats);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket || !active?.id) return undefined;
    socket.emit("join_chat", active.id);
    const receive = (message) => {
      if (message.chatSessionId !== active.id) return;
      setMessagesByChat((current) => appendMessage(current, active.id, message));
    };
    const typing = (payload) => payload.user?.id !== user?.id && setTypingUsers([payload.user]);
    const stopTyping = (payload) => payload.user?.id !== user?.id && setTypingUsers([]);
    socket.on("receive_message", receive);
    socket.on("typing", typing);
    socket.on("stop_typing", stopTyping);
    return () => {
      socket.emit("leave_chat", active.id);
      socket.off("receive_message", receive);
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
          showNotice(response?.message || "Message failed. Please check the backend connection.", "rose");
          return;
        }
        const message = response.data?.message;
        if (!message) return;
        setMessagesByChat((current) => appendMessage(current, active.id, message));
        const sentMessages = [message].filter(Boolean);
        setActive((current) => current?.id === active.id ? { ...current, status: "ACTIVE", lastMessage: sentMessages.at(-1)?.content, messages: mergeMessages(current.messages, sentMessages), updatedAt: new Date().toISOString() } : current);
        setSessions((current) => sortByRecent(current.map((item) => item.id === active.id ? { ...item, status: "ACTIVE", lastMessage: sentMessages.at(-1)?.content, messages: mergeMessages(item.messages, sentMessages), updatedAt: new Date().toISOString() } : item)));
      });
    } else {
      let message;
      try {
        const { data } = await api.post(`/chats/${active.id}/message`, payload);
        message = data.data?.message || data.message || data.data || data;
      } catch (error) {
        showNotice(error.friendlyMessage || "Message failed. Please check the backend connection.", "rose");
        return;
      }
      setMessagesByChat((current) => appendMessage(current, active.id, message));
      const sentMessages = [message].filter(Boolean);
      setActive((current) => current?.id === active.id ? { ...current, status: "ACTIVE", lastMessage: sentMessages.at(-1)?.content, messages: mergeMessages(current.messages, sentMessages), updatedAt: new Date().toISOString() } : current);
      setSessions((current) => sortByRecent(current.map((item) => item.id === active.id ? { ...item, status: "ACTIVE", lastMessage: sentMessages.at(-1)?.content, messages: mergeMessages(item.messages, sentMessages), updatedAt: new Date().toISOString() } : item)));
    }
  };

  const transferChat = async () => {
    if (!active?.id) {
      showNotice("Select a chat first.");
      return;
    }
    if (activeClosed) {
      showNotice("Closed chats cannot be transferred.");
      return;
    }
    if (!transferAgentId) {
      showNotice("Select an agent before transferring this chat.");
      return;
    }
    let chat;
    setActionLoading("transfer");
    try {
      const { data } = await api.post(`/chats/${active.id}/transfer`, { agentId: transferAgentId });
      chat = data.data || data;
    } catch (error) {
      showNotice(error.friendlyMessage || "Transfer failed. Please check the backend connection.", "rose");
      setActionLoading("");
      return;
    }
    setActive(chat);
    setSessions((current) => sortByRecent(current.map((item) => item.id === chat.id ? chat : item)));
    setTransferAgentId("");
    setActionLoading("");
    showNotice("Chat transferred.", "emerald");
    pushNotification({ message: "Admin transferred a chat.", type: "transfer" });
  };

  const closeChat = async () => {
    if (!active?.id) {
      showNotice("Select a chat first.");
      return;
    }
    if (activeClosed) {
      showNotice("This chat is already closed.");
      return;
    }
    let chat;
    setActionLoading("close");
    try {
      const { data } = await api.put(`/chats/${active.id}/close`);
      chat = data.data || data;
    } catch (error) {
      showNotice(error.friendlyMessage || "Close failed. Please check the backend connection.", "rose");
      setActionLoading("");
      return;
    }
    setActive(chat);
    setSessions((current) => sortByRecent(current.map((item) => item.id === chat.id ? chat : item)));
    setActionLoading("");
    showNotice("Chat closed and stored in history.", "emerald");
    pushNotification({ message: "Admin closed a chat transcript.", type: "chat" });
  };

  return (
    <>
      <PageHeader title="Chat monitoring" description="Monitor live conversations, AI-to-agent handoffs, queues, notifications, and visitor sessions." />
      {notice ? <p className={`mb-4 rounded-md border px-3 py-2 text-sm font-semibold ${noticeClass}`}>{notice}</p> : null}
      <div className="grid items-start gap-4 2xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-h-[620px] min-w-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm md:flex-row xl:h-[calc(100vh-10.25rem)] xl:min-h-[640px] xl:max-h-[860px]">
          <ChatSidebar sessions={sessions} activeId={active?.id} onSelect={selectSession} />
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
        <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm 2xl:sticky 2xl:top-24 2xl:max-h-[calc(100vh-6.5rem)] 2xl:overflow-y-auto">
          <h2 className="font-semibold text-slate-950">{t("ticketsUi.workflow")}</h2>
          <p className="mt-1 text-sm text-slate-500">{t("chat.manageSelectedConversation")}</p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-md border border-amber-100 bg-amber-50 p-2 font-semibold text-amber-700"><p className="text-base font-bold">{queueStats.waiting}</p><p className="truncate">{t("chat.waiting")}</p></div>
            <div className="rounded-md border border-green-100 bg-green-50 p-2 font-semibold text-green-700"><p className="text-base font-bold">{queueStats.active}</p><p className="truncate">{t("chat.active")}</p></div>
            <div className="rounded-md border border-slate-200 bg-slate-100 p-2 font-semibold text-slate-700"><p className="text-base font-bold">{queueStats.closed}</p><p className="truncate">{t("chat.closed")}</p></div>
          </div>
          <label className="mt-4 block">
            <span className="app-label">{t("chat.transferTo")}</span>
            <select className="app-field mt-1" value={transferAgentId} onChange={(event) => setTransferAgentId(event.target.value)}>
              <option value="">{t("ticketsUi.unassigned")}</option>
              {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
            </select>
          </label>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button variant="secondary" className="w-full" icon={ArrowRightLeft} onClick={transferChat} loading={actionLoading === "transfer"} disabled={!active?.id || activeClosed || !transferAgentId || actionBusy}>{t("buttons.transfer")}</Button>
            <Button variant="danger" className="w-full" onClick={closeChat} loading={actionLoading === "close"} disabled={!active?.id || activeClosed || actionBusy}>{t("buttons.close")}</Button>
          </div>
          <div className="mt-5 border-t border-slate-200 pt-4">
            <h3 className="text-sm font-semibold text-slate-950">{t("chat.visitorAndSecurity")}</h3>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-md bg-slate-50 p-2.5"><dt className="text-xs text-slate-500">{t("chat.visitorPage")}</dt><dd className="mt-1 truncate font-semibold text-slate-800" title={visitorPage(active)}>{visitorPage(active)}</dd></div>
              <div className="rounded-md bg-slate-50 p-2.5"><dt className="text-xs text-slate-500">{t("chat.device")}</dt><dd className="mt-1 truncate font-semibold text-slate-800">{visitorDevice(active)}</dd></div>
              <div className="rounded-md bg-slate-50 p-2.5"><dt className="text-xs text-slate-500">{t("chat.channel")}</dt><dd className="mt-1 truncate font-semibold text-slate-800">{active?.channel || "Website chatbot"}</dd></div>
              <div className="rounded-md bg-slate-50 p-2.5"><dt className="text-xs text-slate-500">{t("chat.encryption")}</dt><dd className="mt-1 font-semibold text-slate-800">{t("aiSettings.states.enabled")}</dd></div>
            </dl>
          </div>
        </aside>
      </div>
    </>
  );
}

