import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import api, { uploadFile } from "../../api/axios.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import ChatSidebar from "../../components/chat/ChatSidebar.jsx";
import ChatWindow from "../../components/chat/ChatWindow.jsx";
import Button from "../../components/common/Button.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useSocket } from "../../context/SocketContext.jsx";
import { normalizeItems } from "../../utils/helpers.js";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../context/LanguageContext.jsx";

const appendMessage = (current, chatId, message) => {
  const existing = current[chatId] || [];
  if (existing.some((item) => item.id === message.id)) return current;
  return { ...current, [chatId]: [...existing, message] };
};

const mergeMessages = (currentMessages = [], incomingMessages = []) => {
  const byId = new Map(currentMessages.map((message) => [message.id, message]));
  incomingMessages.forEach((message) => byId.set(message.id, message));
  return Array.from(byId.values()).sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
};

export default function CustomerLiveChat() {
  const { user } = useAuth();
  const location = useLocation();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { socket, pushNotification } = useSocket();
  const [sessions, setSessions] = useState([]);
  const [active, setActive] = useState(null);
  const [messagesByChat, setMessagesByChat] = useState({});
  const [typingUsers, setTypingUsers] = useState([]);
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState("");
  const [notice, setNotice] = useState("");
  const [noticeTone, setNoticeTone] = useState("emerald");
  const [actionLoading, setActionLoading] = useState("");
  const [startingChat, setStartingChat] = useState(false);
  const activeMessages = useMemo(() => active?.messages || [], [active]);
  const preferredChatId = location.state?.chatId;
  const activeClosed = active?.status === "CLOSED";
  const noticeClass = {
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    amber: "border-amber-100 bg-amber-50 text-amber-800",
    rose: "border-rose-100 bg-rose-50 text-rose-700",
  }[noticeTone] || "border-slate-200 bg-slate-50 text-slate-700";

  const showNotice = (message, tone = "emerald") => {
    setNotice(message);
    setNoticeTone(tone);
  };

  const selectSession = (session) => {
    setActive(session);
    setNotice("");
  };

  const loadChats = () => api.get("/chats").then(({ data }) => {
    const rows = normalizeItems(data, []);
    const selected = rows.find((row) => row.id === preferredChatId) || rows[0] || null;
    setSessions(rows);
    setActive(selected);
    setMessagesByChat(Object.fromEntries(rows.map((row) => [row.id, row.messages || []])));
  }).catch(() => {
    setSessions([]);
    setActive(null);
    setMessagesByChat({});
  });

  useEffect(() => {
    loadChats();
  }, [preferredChatId]);

  const startChat = async () => {
    setStartingChat(true);
    try {
      const visits = Number(localStorage.getItem("visitorVisits") || 0) + 1;
      localStorage.setItem("visitorVisits", String(visits));
      const { data } = await api.post("/chats/start", {
        language,
        visitorPage: window.location.pathname,
        visitorDevice: navigator.userAgent,
        visitorVisits: visits,
      });
      const session = data.data || data;
      setSessions((current) => [session, ...current]);
      setActive(session);
      setMessagesByChat((current) => ({ ...current, [session.id]: session.messages || [] }));
      showNotice(t("chat.liveChatStarted"));
      pushNotification({ message: "New customer chat added to the live queue.", type: "chat" });
    } catch (error) {
      showNotice(error.friendlyMessage || "Could not start chat. Please check backend connection.", "rose");
    } finally {
      setStartingChat(false);
    }
  };

  useEffect(() => {
    if (!socket || !active?.id) return undefined;
    socket.emit("join_chat", active.id);
    const receive = (message) => {
      if (message.chatSessionId !== active.id) return;
      setMessagesByChat((current) => appendMessage(current, active.id, message));
    };
    const chatUpdate = (chat) => {
      const updated = chat.chat || chat;
      if (updated.id !== active.id) return;
      setSessions((current) => current.map((item) => item.id === updated.id ? { ...updated, messages: mergeMessages(item.messages, updated.messages) } : item).sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)));
      setActive((current) => current?.id === updated.id ? { ...updated, messages: mergeMessages(current.messages, updated.messages) } : current);
      setMessagesByChat((current) => ({ ...current, [updated.id]: mergeMessages(current[updated.id], updated.messages) }));
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
    if (activeClosed) {
      showNotice("This chat is closed. Start a new chat to send another message.", "amber");
      return;
    }
    let filePayload = {};
    if (file) filePayload = await uploadFile(file);
    const payload = { content: content || filePayload.fileName || "Attachment", ...filePayload, chatSessionId: active.id, senderId: user?.id, senderName: user?.name };
    let message;
    let aiMessage;
    try {
      const { data } = await api.post(`/chats/${active.id}/message`, payload);
      message = data.data?.message || data.message || data.data || data;
      aiMessage = data.data?.aiMessage || data.aiMessage;
    } catch (error) {
      showNotice(error.friendlyMessage || "Message failed.", "rose");
      return;
    }
    setMessagesByChat((current) => {
      const withMessage = appendMessage(current, active.id, message);
      return aiMessage ? appendMessage(withMessage, active.id, aiMessage) : withMessage;
    });
    const sentMessages = [message, aiMessage].filter(Boolean);
    setActive((current) => current?.id === active.id ? { ...current, status: "ACTIVE", lastMessage: sentMessages.at(-1)?.content, messages: mergeMessages(current.messages, sentMessages), updatedAt: new Date().toISOString() } : current);
    setSessions((current) => current.map((item) => item.id === active.id ? { ...item, status: "ACTIVE", lastMessage: sentMessages.at(-1)?.content, messages: mergeMessages(item.messages, sentMessages), updatedAt: new Date().toISOString() } : item));
  };

  const requestAgent = async () => {
    if (!active?.id) {
      showNotice("Select a chat first.", "amber");
      return;
    }
    if (activeClosed) {
      showNotice("This chat is closed. Start a new chat to request an agent.", "amber");
      return;
    }
    let updated;
    let message;
    setActionLoading("agent");
    try {
      const { data } = await api.post(`/chats/${active.id}/transfer`, { agentId: null });
      updated = data.data || data;
      message = updated.messages?.at(-1);
    } catch (error) {
      showNotice(error.friendlyMessage || "Transfer failed.", "rose");
      setActionLoading("");
      return;
    }
    setActive(updated);
    setSessions((current) => current.map((item) => item.id === updated.id ? updated : item));
    if (message) setMessagesByChat((current) => appendMessage(current, active.id, message));
    setActionLoading("");
    showNotice("An agent transfer was requested.");
    pushNotification({ message: "AI-to-agent transfer requested.", type: "transfer" });
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
    setSessions((current) => current.map((item) => item.id === chat.id ? chat : item));
    setActionLoading("");
    showNotice("Chat closed.");
    pushNotification({ message: "Customer chat closed and saved to history.", type: "chat" });
  };

  const submitRating = async () => {
    if (!active?.id) {
      showNotice("Select a chat first.", "amber");
      return;
    }
    let chat;
    setActionLoading("rating");
    try {
      const { data } = await api.post(`/chats/${active.id}/rating`, { rating: Number(rating), feedback });
      chat = data.data || data;
    } catch (error) {
      showNotice(error.friendlyMessage || "Rating failed.", "rose");
      setActionLoading("");
      return;
    }
    setActive(chat);
    setSessions((current) => current.map((item) => item.id === chat.id ? chat : item));
    setActionLoading("");
    showNotice("Thanks, your feedback was saved.");
    pushNotification({ message: `Customer submitted a ${rating}/5 chat rating.`, type: "rating" });
  };

  return (
    <>
      <PageHeader title={t("pages.customerLiveChat.title")} description={t("pages.customerLiveChat.description")} actions={<Button onClick={startChat} loading={startingChat}>{t("buttons.startChat")}</Button>} />
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
            onAiTransfer={requestAgent}
            onClose={closeChat}
            aiTransferLoading={actionLoading === "agent"}
            aiTransferDisabled={!active?.id || activeClosed || Boolean(actionLoading)}
            closeLoading={actionLoading === "close"}
            closeDisabled={!active?.id || activeClosed || Boolean(actionLoading)}
          />
        </div>
        <aside className="rounded-lg border border-slate-200/80 bg-white/94 p-5 shadow-[0_16px_38px_rgba(15,23,42,0.06)] xl:sticky xl:top-24">
          <h2 className="font-semibold">{t("chat.ratingTitle")}</h2>
          <p className="mt-2 text-sm text-slate-500">{t("chat.ratingHelp")}</p>
          <select className="mt-4 h-11 w-full rounded-md border border-slate-200 px-3" value={rating} onChange={(event) => setRating(event.target.value)}>
            <option value="5">5 - Excellent</option><option value="4">4 - Good</option><option value="3">3 - Neutral</option><option value="2">2 - Poor</option><option value="1">1 - Bad</option>
          </select>
          <textarea className="mt-3 min-h-28 w-full rounded-md border border-slate-200 p-3" placeholder={t("chat.feedback")} value={feedback} onChange={(event) => setFeedback(event.target.value)} />
          <Button className="mt-3 w-full" onClick={submitRating} loading={actionLoading === "rating"} disabled={!active?.id || Boolean(actionLoading)}>{t("buttons.submitRating")}</Button>
        </aside>
      </div>
    </>
  );
}
