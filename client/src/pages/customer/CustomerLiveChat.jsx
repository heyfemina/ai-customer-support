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
import { Star } from "lucide-react";

const chatCategories = ["Technical", "Billing", "Account", "Refund", "General", "Complaint"];

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
  const [chatCategory, setChatCategory] = useState("General");
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
        category: chatCategory,
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
    try {
      const { data } = await api.post(`/chats/${active.id}/message`, payload);
      message = data.data?.message || data.message || data.data || data;
    } catch (error) {
      showNotice(error.friendlyMessage || "Message failed.", "rose");
      return;
    }
    setMessagesByChat((current) => appendMessage(current, active.id, message));
    const sentMessages = [message].filter(Boolean);
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

  const ratingCard = activeClosed ? (
    <div className="mb-5 rounded-2xl border border-slate-300 bg-white p-5 shadow-[0_14px_34px_rgba(15,23,42,0.07)]">
      <div className="grid h-10 w-10 place-items-center rounded-full bg-blue-50 text-blue-700 ring-1 ring-blue-100">
        <Star className="h-5 w-5" />
      </div>
      <h3 className="mt-3 font-semibold text-slate-950">{t("chat.rateThisChat")}</h3>
      <p className="mt-1 text-sm text-slate-500">{active?.rating ? t("chat.feedbackSaved") : t("chat.closedRatingHelp")}</p>
      {!active?.rating ? (
        <>
          <div className="mt-4 grid max-w-md grid-cols-5 gap-2">
            {ratingOptions.map((option) => {
              const selected = Number(rating) === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`flex h-11 items-center justify-center rounded-xl border text-xs font-bold transition ${selected ? "border-blue-300 bg-blue-50 text-blue-800 ring-2 ring-blue-100" : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800"}`}
                  onClick={() => setRating(option.value)}
                  title={option.label}
                >
                  <Star className={`h-4 w-4 ${selected ? "fill-blue-700 text-blue-700" : "text-slate-400"}`} />
                  <span className="ml-1">{option.value}</span>
                </button>
              );
            })}
          </div>
          <textarea className="app-field mt-3 min-h-24 resize-none rounded-xl" placeholder={t("chat.feedback")} value={feedback} onChange={(event) => setFeedback(event.target.value)} />
          <Button className="mt-3 min-h-11 rounded-xl" onClick={submitRating} loading={actionLoading === "rating"} disabled={Boolean(actionLoading)}>{t("buttons.submitRating")}</Button>
        </>
      ) : null}
    </div>
  ) : null;

  return (
    <>
      <PageHeader
        title={t("pages.customerLiveChat.title")}
        description={t("pages.customerLiveChat.description")}
        actions={
          <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:w-[24rem]">
            <select className="app-field h-10 min-w-0 rounded-lg bg-white text-sm" value={chatCategory} onChange={(event) => setChatCategory(event.target.value)}>
              {chatCategories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
            <Button className="whitespace-nowrap" onClick={startChat} loading={startingChat}>{t("buttons.startChat")}</Button>
          </div>
        }
      />
      {notice ? <p className={`mb-4 rounded-md border px-3 py-2 text-sm font-semibold ${noticeClass}`}>{notice}</p> : null}
      {ratingCard}
      <div className="grid items-start gap-5">
        <div className="flex min-h-[560px] min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-[0_14px_34px_rgba(15,23,42,0.07)] md:flex-row xl:h-[calc(100vh-15rem)] xl:min-h-[520px] xl:max-h-[760px]">
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
      </div>
    </>
  );
}

