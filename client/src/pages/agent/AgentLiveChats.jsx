import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import api, { uploadFile } from "../../api/axios.js";
import ChatSidebar from "../../components/chat/ChatSidebar.jsx";
import ChatWindow from "../../components/chat/ChatWindow.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useSocket } from "../../context/SocketContext.jsx";
import { mergeMessages, normalizeItems, sortByRecent, visitorDevice, visitorPage } from "../../utils/helpers.js";
import Button from "../../components/common/Button.jsx";
import { useTranslation } from "react-i18next";
import { ArrowRightLeft, CheckCircle2, Clock, Headphones, Monitor, Radio, ShieldCheck, UserCheck, Users } from "lucide-react";

const appendMessage = (current, chatId, message) => {
  const existing = current[chatId] || [];
  if (existing.some((item) => item.id === message.id)) return current;
  return { ...current, [chatId]: [...existing, message] };
};

export default function AgentLiveChats() {
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
  const [noticeTone, setNoticeTone] = useState("emerald");
  const [actionLoading, setActionLoading] = useState("");
  const activeMessages = useMemo(() => active?.messages || [], [active]);
  const preferredChatId = location.state?.chatId;
  const queueStats = {
    waiting: sessions.filter((session) => session.status === "WAITING").length,
    active: sessions.filter((session) => ["ASSIGNED", "ACTIVE"].includes(session.status)).length,
    transferred: sessions.filter((session) => session.status === "TRANSFERRED").length,
  };
  const activeClosed = active?.status === "CLOSED";
  const actionBusy = Boolean(actionLoading);
  const noticeClass = {
    emerald: "border-green-100 bg-green-50 text-green-700",
    amber: "border-amber-100 bg-amber-50 text-amber-800",
    rose: "border-red-100 bg-red-50 text-red-700",
  }[noticeTone] || "border-slate-200 bg-slate-50 text-slate-700";
  const activeCustomerName = active?.customer?.name || active?.customerName || "No chat selected";
  const activeCustomerEmail = active?.customer?.email || active?.customerEmail || "Select a conversation";
  const activeCategory = active?.category || active?.channel || "General";
  const visibleAgents = agents.slice(0, 10);

  const showNotice = (message, tone = "emerald") => {
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
          showNotice(response?.message || "Message failed.", "rose");
          return;
        }
        const { message } = response.data || {};
        setMessagesByChat((current) => message ? appendMessage(current, active.id, message) : current);
        const sentMessages = [message].filter(Boolean);
        const preview = sentMessages.at(-1);
        if (preview) {
          setActive((current) => current?.id === active.id ? { ...current, status: "ACTIVE", lastMessage: preview.content, messages: mergeMessages(current.messages, sentMessages), updatedAt: new Date().toISOString() } : current);
          setSessions((current) => sortByRecent(current.map((item) => item.id === active.id ? { ...item, status: "ACTIVE", lastMessage: preview.content, messages: mergeMessages(item.messages, sentMessages), updatedAt: new Date().toISOString() } : item)));
        }
      });
    } else {
      let message;
      try {
        const { data } = await api.post(`/chats/${active.id}/message`, payload);
        message = data.data?.message || data.message || data.data || data;
      } catch (error) {
        showNotice(error.friendlyMessage || "Message failed.", "rose");
        return;
      }
      setMessagesByChat((current) => appendMessage(current, active.id, message));
      setSessions((current) => sortByRecent(current.map((item) => item.id === active.id ? { ...item, lastMessage: message?.content, updatedAt: new Date().toISOString() } : item)));
    }
  };

  const acceptChat = async () => {
    if (!active?.id) {
      showNotice("Select a chat first.", "amber");
      return;
    }
    if (activeClosed) {
      showNotice("Closed chats cannot be accepted again.", "amber");
      return;
    }
    let chat;
    setActionLoading("accept");
    try {
      const { data } = await api.post(`/chats/${active.id}/accept`);
      chat = data.data || data;
    } catch (error) {
      showNotice(error.friendlyMessage || "Accept failed.", "rose");
      setActionLoading("");
      return;
    }
    setActive(chat);
    setSessions((current) => sortByRecent(current.map((item) => item.id === chat.id ? chat : item)));
    setActionLoading("");
    showNotice("Chat accepted. Customer can continue in real time.");
    pushNotification({ message: "Agent accepted a waiting chat.", type: "queue" });
  };

  const transferChat = async () => {
    if (!active?.id) {
      showNotice("Select a chat first.", "amber");
      return;
    }
    if (activeClosed) {
      showNotice("Closed chats cannot be transferred.", "amber");
      return;
    }
    if (!transferAgentId) {
      showNotice("Select an agent to transfer this chat.", "amber");
      return;
    }
    let chat;
    setActionLoading("transfer");
    try {
      const { data } = await api.post(`/chats/${active.id}/transfer`, { agentId: transferAgentId });
      chat = data.data || data;
    } catch (error) {
      showNotice(error.friendlyMessage || "Transfer failed.", "rose");
      setActionLoading("");
      return;
    }
    setActive(chat);
    setSessions((current) => sortByRecent(current.map((item) => item.id === chat.id ? chat : item)));
    setTransferAgentId("");
    setActionLoading("");
    showNotice("Chat transferred.");
    pushNotification({ message: "Chat transferred to another agent.", type: "transfer" });
  };

  const closeChat = async () => {
    if (!active?.id) {
      showNotice("Select a chat first.", "amber");
      return;
    }
    if (activeClosed) {
      showNotice("This chat is already closed.", "amber");
      return;
    }
    let chat;
    setActionLoading("close");
    try {
      const { data } = await api.put(`/chats/${active.id}/close`);
      chat = data.data || data;
    } catch (error) {
      showNotice(error.friendlyMessage || "Close failed.", "rose");
      setActionLoading("");
      return;
    }
    setActive(chat);
    setSessions((current) => sortByRecent(current.map((item) => item.id === chat.id ? chat : item)));
    setActionLoading("");
    showNotice("Chat closed and stored in history.");
    pushNotification({ message: "Chat closed and stored in history.", type: "chat" });
  };

  return (
    <section className="support-console-page">
      <div className="support-page-hero support-page-hero-compact agent-console-toolbar">
        <div className="min-w-0">
          <p className="support-page-kicker">Agent console</p>
          <h1>Live chat queue</h1>
          <p>Accept conversations, transfer customers, review visitor context, and respond in real time.</p>
        </div>
        <div className="support-hero-agent">
          <div className="support-hero-avatar">
            <Headphones className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className={`support-live-dot ${connected ? "is-online" : "is-offline"}`} />
              <p className="truncate text-sm font-bold text-slate-950">{connected ? "Realtime online" : "Realtime offline"}</p>
            </div>
            <p className="mt-0.5 truncate text-xs font-semibold text-slate-500">{user?.name || "Agent"} / {user?.email || "support desk"}</p>
          </div>
        </div>
      </div>
      {notice ? <p className={`mb-4 rounded-md border px-3 py-2 text-sm font-semibold ${noticeClass}`}>{notice}</p> : null}

      <div className="support-command-strip support-command-strip-compact agent-command-strip">
        <div className="support-command-card">
          <span className="support-command-icon bg-amber-50 text-amber-700 ring-amber-100"><Clock className="h-4 w-4" /></span>
          <div><p>{queueStats.waiting}</p><span>{t("chat.waiting")}</span></div>
        </div>
        <div className="support-command-card">
          <span className="support-command-icon bg-green-50 text-green-700 ring-green-100"><Radio className="h-4 w-4" /></span>
          <div><p>{queueStats.active}</p><span>{t("chat.active")}</span></div>
        </div>
        <div className="support-command-card">
          <span className="support-command-icon bg-blue-50 text-blue-700 ring-blue-100"><ArrowRightLeft className="h-4 w-4" /></span>
          <div><p>{queueStats.transferred}</p><span>{t("chat.transfers")}</span></div>
        </div>
        <div className="support-command-card">
          <span className="support-command-icon bg-slate-100 text-slate-700 ring-slate-200"><Users className="h-4 w-4" /></span>
          <div><p>{agents.length}</p><span>Agents online</span></div>
        </div>
      </div>

      <div className="support-workspace support-workspace-agent">
        <div className="support-chat-shell agent-chat-shell flex min-h-[560px] min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-[0_14px_34px_rgba(15,23,42,0.07)] md:flex-row xl:h-[calc(100vh-17rem)] xl:min-h-[520px] xl:max-h-[720px]">
          <ChatSidebar sessions={sessions} activeId={active?.id} onSelect={selectSession} showMetrics={false} />
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
        <aside className="support-inspector agent-inspector rounded-2xl border border-slate-300 bg-white p-4 shadow-[0_14px_34px_rgba(15,23,42,0.07)]">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-blue-50 text-blue-700 ring-1 ring-blue-100">
              <UserCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-slate-900">Conversation control</h2>
              <p className="truncate text-sm text-slate-500">Selected chat workspace</p>
            </div>
          </div>

          <div className="support-selected-card">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-blue-900 text-sm font-bold text-white">
              {activeCustomerName.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-950">{activeCustomerName}</p>
              <p className="truncate text-xs text-slate-500">{activeCustomerEmail}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700 ring-1 ring-blue-100">{active?.status || "IDLE"}</span>
                <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{activeCategory}</span>
              </div>
            </div>
          </div>

          <Button className="mt-4 w-full" icon={CheckCircle2} onClick={acceptChat} loading={actionLoading === "accept"} disabled={!active?.id || activeClosed || actionBusy}>{t("buttons.accept")}</Button>
          <label className="mt-4 block">
            <span className="app-label">{t("chat.transferTo")}</span>
            <select className="app-field mt-1.5" value={transferAgentId} onChange={(event) => setTransferAgentId(event.target.value)}>
              <option value="">{t("ticketsUi.unassigned")}</option>
              {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
            </select>
          </label>
          <div className="mt-3 grid gap-2">
            <Button variant="secondary" className="w-full" icon={ArrowRightLeft} onClick={transferChat} loading={actionLoading === "transfer"} disabled={!active?.id || activeClosed || !transferAgentId || actionBusy}>{t("buttons.transfer")}</Button>
            <Button variant="danger" className="w-full" onClick={closeChat} loading={actionLoading === "close"} disabled={!active?.id || activeClosed || actionBusy}>{t("buttons.close")}</Button>
          </div>
          <div className="mt-4 border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900"><Users className="h-4 w-4 text-blue-700" />{t("chat.multiAgentSupport")}</h3>
              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-600">{agents.length}</span>
            </div>
            <div className="mt-3 grid gap-1.5">
              {visibleAgents.length ? visibleAgents.map((agent) => <span key={agent.id} className="support-agent-chip" title={agent.name}>{agent.name}</span>) : <span className="text-sm text-slate-500">{t("chat.noAgentsLoaded")}</span>}
              {agents.length > visibleAgents.length ? <span className="rounded-md border border-slate-200 px-2.5 py-1.5 text-center text-xs font-bold text-slate-500">+{agents.length - visibleAgents.length} more agents</span> : null}
            </div>
          </div>
          <div className="mt-4 border-t border-slate-200 pt-4">
            <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-slate-900"><Monitor className="h-4 w-4 text-blue-700" />{t("chat.visitorTracking")}</h3>
            <dl className="mt-3 grid gap-2 text-sm">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-2.5"><dt className="text-xs text-slate-500">{t("chat.page")}</dt><dd className="mt-1 truncate font-semibold text-slate-800" title={visitorPage(active)}>{visitorPage(active)}</dd></div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-2.5"><dt className="text-xs text-slate-500">{t("chat.device")}</dt><dd className="mt-1 truncate font-semibold text-slate-800">{visitorDevice(active)}</dd></div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-md border border-slate-200 bg-slate-50 p-2.5"><dt className="text-xs text-slate-500">{t("chat.visits")}</dt><dd className="mt-1 font-semibold text-slate-800">{active?.visitor?.visits || 1}</dd></div>
                <div className="rounded-md border border-slate-200 bg-slate-50 p-2.5"><dt className="inline-flex items-center gap-1 text-xs text-slate-500"><ShieldCheck className="h-4 w-4" />{t("chat.security")}</dt><dd className="mt-1 font-semibold text-slate-800">{t("chat.encrypted")}</dd></div>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </section>
  );
}

