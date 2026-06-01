import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import api, { uploadFile } from "../../api/axios.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import ChatSidebar from "../../components/chat/ChatSidebar.jsx";
import ChatWindow from "../../components/chat/ChatWindow.jsx";
import Button from "../../components/common/Button.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useSocket } from "../../context/SocketContext.jsx";
import { mergeMessages, normalizeItems, sortByRecent } from "../../utils/helpers.js";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../context/LanguageContext.jsx";
import { MessageSquare, ShieldCheck, Star } from "lucide-react";

const appendMessage = (current, chatId, message) => {
  const existing = current[chatId] || [];
  if (existing.some((item) => item.id === message.id)) return current;
  return { ...current, [chatId]: [...existing, message] };
};

const ratingOptions = [
  { value: 5, label: "Excellent" },
  { value: 4, label: "Good" },
  { value: 3, label: "Neutral" },
  { value: 2, label: "Poor" },
  { value: 1, label: "Bad" },
];

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
    emerald: "border-green-100 bg-green-50 text-green-700",
    amber: "border-amber-100 bg-amber-50 text-amber-800",
    rose: "border-red-100 bg-red-50 text-red-700",
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
    const rows = sortByRecent(normalizeItems(data, []));
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
      setSessions((current) => sortByRecent([session, ...current]));
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
      setSessions((current) => sortByRecent(current.map((item) => item.id === updated.id ? { ...updated, messages: mergeMessages(item.messages, updated.messages) } : item)));
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
    setSessions((current) => sortByRecent(current.map((item) => item.id === active.id ? { ...item, status: "ACTIVE", lastMessage: sentMessages.at(-1)?.content, messages: mergeMessages(item.messages, sentMessages), updatedAt: new Date().toISOString() } : item)));
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
    setSessions((current) => sortByRecent(current.map((item) => item.id === updated.id ? updated : item)));
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
    setSessions((current) => sortByRecent(current.map((item) => item.id === chat.id ? chat : item)));
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
    setSessions((current) => sortByRecent(current.map((item) => item.id === chat.id ? chat : item)));
    setActionLoading("");
    showNotice("Thanks, your feedback was saved.");
    pushNotification({ message: `Customer submitted a ${rating}/5 chat rating.`, type: "rating" });
  };

  return (
    <>
      <PageHeader title={t("pages.customerLiveChat.title")} description={t("pages.customerLiveChat.description")} actions={<Button onClick={startChat} loading={startingChat}>{t("buttons.startChat")}</Button>} />
      {notice ? <p className={`mb-4 rounded-md border px-3 py-2 text-sm font-semibold ${noticeClass}`}>{notice}</p> : null}
      <div className="grid items-start gap-5 2xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-h-[660px] min-w-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm md:flex-row xl:h-[calc(100vh-11rem)] xl:min-h-[680px] xl:max-h-[900px]">
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
        <aside className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm 2xl:sticky 2xl:top-24">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                <Star className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-950">{t("chat.ratingTitle")}</h2>
                <p className="mt-1 text-sm leading-5 text-slate-500">{t("chat.ratingHelp")}</p>
              </div>
            </div>
          </div>
          <div className="space-y-4 p-5">
            <div className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <MessageSquare className="h-4 w-4 text-blue-700" />
                <span>{active?.customer?.name || active?.customerName || t("chat.customerFallback")}</span>
              </div>
              <p className="mt-1 truncate text-xs text-slate-500">{active?.lastMessage || t("chat.noMessages")}</p>
            </div>
            <div>
              <span className="app-label">Rate this chat</span>
              <div className="mt-2 grid grid-cols-5 gap-2">
                {ratingOptions.map((option) => {
                  const selected = Number(rating) === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      className={`flex h-12 flex-col items-center justify-center rounded-lg border text-xs font-bold transition ${selected ? "border-blue-300 bg-blue-50 text-blue-800 ring-2 ring-blue-100" : "border-slate-200 bg-white text-slate-500 hover:border-blue-200 hover:bg-blue-50"}`}
                      onClick={() => setRating(option.value)}
                      title={option.label}
                    >
                      <Star className={`h-4 w-4 ${selected ? "fill-blue-700 text-blue-700" : "text-slate-400"}`} />
                      {option.value}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs font-semibold text-slate-500">{ratingOptions.find((option) => option.value === Number(rating))?.label}</p>
            </div>
            <label className="block">
              <span className="app-label">Feedback</span>
              <textarea className="app-field mt-1.5 min-h-28 resize-none rounded-lg bg-white" placeholder={t("chat.feedback")} value={feedback} onChange={(event) => setFeedback(event.target.value)} />
            </label>
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
              <p className="inline-flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4" />Secure feedback</p>
              <p className="mt-1 text-xs leading-5 text-blue-800">Your rating is saved with this conversation history.</p>
            </div>
            <Button className="min-h-11 w-full rounded-lg" onClick={submitRating} loading={actionLoading === "rating"} disabled={!active?.id || Boolean(actionLoading)}>{t("buttons.submitRating")}</Button>
          </div>
        </aside>
      </div>
    </>
  );
}

