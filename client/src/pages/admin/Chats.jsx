import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import api, { uploadFile } from "../../api/axios.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import ChatSidebar from "../../components/chat/ChatSidebar.jsx";
import ChatWindow from "../../components/chat/ChatWindow.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useSocket } from "../../context/SocketContext.jsx";
import { normalizeItems } from "../../utils/helpers.js";
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
    active: sessions.filter((session) => session.status === "ACTIVE").length,
    closed: sessions.filter((session) => session.status === "CLOSED").length,
  };
  const activeClosed = active?.status === "CLOSED";
  const actionBusy = Boolean(actionLoading);
  const noticeClass = {
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    amber: "border-amber-100 bg-amber-50 text-amber-800",
    rose: "border-rose-100 bg-rose-50 text-rose-700",
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

  useEffect(() => {
    api.get("/chats").then(({ data }) => {
      const rows = normalizeItems(data, []);
      setSessions(rows);
      setActive(rows.find((row) => row.id === preferredChatId) || rows[0] || null);
      setMessagesByChat(Object.fromEntries(rows.map((row) => [row.id, row.messages || []])));
    }).catch(() => {
      setSessions([]);
      setActive(null);
      setMessagesByChat({});
    });
    api.get("/reports/agents").then(({ data }) => setAgents(normalizeItems(data, []))).catch(() => setAgents([]));
  }, [preferredChatId]);

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
          showNotice(response?.message || "Message failed. Please check the backend connection.", "rose");
          return;
        }
        const message = response.data?.message;
        const aiMessage = response.data?.aiMessage;
        if (!message) return;
        setMessagesByChat((current) => {
          const withMessage = appendMessage(current, active.id, message);
          return aiMessage ? appendMessage(withMessage, active.id, aiMessage) : withMessage;
        });
        setSessions((current) => current.map((item) => item.id === active.id ? { ...item, lastMessage: (aiMessage || message)?.content, updatedAt: new Date().toISOString() } : item));
      });
    } else {
      let message;
      let aiMessage;
      try {
        const { data } = await api.post(`/chats/${active.id}/message`, payload);
        message = data.data?.message || data.message || data.data || data;
        aiMessage = data.data?.aiMessage || data.aiMessage;
      } catch (error) {
        showNotice(error.friendlyMessage || "Message failed. Please check the backend connection.", "rose");
        return;
      }
      setMessagesByChat((current) => {
        const withMessage = appendMessage(current, active.id, message);
        return aiMessage ? appendMessage(withMessage, active.id, aiMessage) : withMessage;
      });
      setSessions((current) => current.map((item) => item.id === active.id ? { ...item, lastMessage: (aiMessage || message)?.content, updatedAt: new Date().toISOString() } : item));
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
    setSessions((current) => current.map((item) => item.id === chat.id ? chat : item));
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
    setSessions((current) => current.map((item) => item.id === chat.id ? chat : item));
    setActionLoading("");
    showNotice("Chat closed and stored in history.", "emerald");
    pushNotification({ message: "Admin closed a chat transcript.", type: "chat" });
  };

  return (
    <>
      <PageHeader title="Chat monitoring" description="Monitor live conversations, AI-to-agent handoffs, queues, notifications, and visitor sessions." />
      {notice ? <p className={`mb-4 rounded-md border px-3 py-2 text-sm font-semibold ${noticeClass}`}>{notice}</p> : null}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-h-[620px] flex-col overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-[0_16px_38px_rgba(15,23,42,0.06)] md:flex-row xl:h-[calc(100vh-12rem)] xl:min-h-[640px] xl:max-h-[860px]">
          <ChatSidebar sessions={sessions} activeId={active?.id} onSelect={selectSession} />
          <ChatWindow
            session={active}
            messages={messagesByChat[active?.id] || activeMessages}
            currentUserId={user?.id}
            typingUsers={typingUsers}
            onTyping={() => socket?.emit("typing", { chatSessionId: active?.id, user })}
            onStopTyping={() => socket?.emit("stop_typing", { chatSessionId: active?.id, user })}
            onSend={sendMessage}
            onTransfer={transferChat}
            onClose={closeChat}
            transferLoading={actionLoading === "transfer"}
            closeLoading={actionLoading === "close"}
            transferDisabled={!active?.id || activeClosed || !transferAgentId || actionBusy}
            closeDisabled={!active?.id || activeClosed || actionBusy}
          />
        </div>
        <aside className="rounded-lg border border-slate-200/80 bg-white/94 p-5 shadow-[0_16px_38px_rgba(15,23,42,0.06)] xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto">
          <h2 className="font-semibold text-slate-950">{t("ticketsUi.workflow")}</h2>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-md border border-amber-100 bg-amber-50 p-2 font-semibold text-amber-700"><p className="text-lg font-bold">{queueStats.waiting}</p><p>{t("chat.waiting")}</p></div>
            <div className="rounded-md border border-emerald-100 bg-emerald-50 p-2 font-semibold text-emerald-700"><p className="text-lg font-bold">{queueStats.active}</p><p>{t("chat.active")}</p></div>
            <div className="rounded-md border border-slate-200 bg-slate-100 p-2 font-semibold text-slate-700"><p className="text-lg font-bold">{queueStats.closed}</p><p>{t("chat.closed")}</p></div>
          </div>
          <label className="mt-4 block">
            <span className="text-sm font-semibold text-slate-700">{t("chat.transferTo")}</span>
            <select className="mt-1 h-11 w-full rounded-md border border-slate-200 px-3" value={transferAgentId} onChange={(event) => setTransferAgentId(event.target.value)}>
              <option value="">{t("ticketsUi.unassigned")}</option>
              {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
            </select>
          </label>
          <Button variant="secondary" className="mt-3 w-full" icon={ArrowRightLeft} onClick={transferChat} loading={actionLoading === "transfer"} disabled={!active?.id || activeClosed || !transferAgentId || actionBusy}>{t("buttons.transfer")}</Button>
          <Button variant="danger" className="mt-3 w-full" onClick={closeChat} loading={actionLoading === "close"} disabled={!active?.id || activeClosed || actionBusy}>{t("buttons.close")}</Button>
          <div className="mt-5 border-t border-slate-200 pt-4">
            <h3 className="text-sm font-semibold text-slate-950">{t("chat.visitorAndSecurity")}</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div><dt className="text-slate-500">{t("chat.visitorPage")}</dt><dd className="font-semibold">{active?.visitor?.page || "/support"}</dd></div>
              <div><dt className="text-slate-500">{t("chat.device")}</dt><dd className="font-semibold">{active?.visitor?.device || "Desktop Chrome"}</dd></div>
              <div><dt className="text-slate-500">{t("chat.channel")}</dt><dd className="font-semibold">{active?.channel || "Website chatbot"}</dd></div>
              <div><dt className="text-slate-500">{t("chat.encryption")}</dt><dd className="font-semibold">{t("aiSettings.states.enabled")}</dd></div>
            </dl>
          </div>
        </aside>
      </div>
    </>
  );
}
