import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import api, { uploadFile } from "../../api/axios.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import ChatSidebar from "../../components/chat/ChatSidebar.jsx";
import ChatWindow from "../../components/chat/ChatWindow.jsx";
import Card from "../../components/common/Card.jsx";
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

export default function CustomerLiveChat() {
  const { user } = useAuth();
  const location = useLocation();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { socket, connected, pushNotification } = useSocket();
  const [sessions, setSessions] = useState([]);
  const [active, setActive] = useState(null);
  const [messagesByChat, setMessagesByChat] = useState({});
  const [typingUsers, setTypingUsers] = useState([]);
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState("");
  const [notice, setNotice] = useState("");
  const activeMessages = useMemo(() => active?.messages || [], [active]);
  const preferredChatId = location.state?.chatId;
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
      setNotice(t("chat.liveChatStarted"));
      pushNotification({ message: "New customer chat added to the live queue.", type: "chat" });
    } catch (error) {
      setNotice(error.friendlyMessage || "Could not start chat. Please check backend connection.");
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
      setActive(updated);
      setSessions((current) => current.map((item) => item.id === updated.id ? updated : item));
      setMessagesByChat((current) => ({ ...current, [updated.id]: updated.messages || current[updated.id] || [] }));
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

  const requestAgent = async () => {
    if (!active?.id) return;
    let updated;
    let message;
    try {
      const { data } = await api.post(`/chats/${active.id}/transfer`, { agentId: null });
      updated = data.data || data;
      message = updated.messages?.at(-1);
    } catch (error) {
      setNotice(error.friendlyMessage || "Transfer failed.");
      return;
    }
    setActive(updated);
    setSessions((current) => current.map((item) => item.id === updated.id ? updated : item));
    if (message) setMessagesByChat((current) => appendMessage(current, active.id, message));
    setNotice("An agent transfer was requested.");
    pushNotification({ message: "AI-to-agent transfer requested.", type: "transfer" });
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
    setNotice("Chat closed.");
    pushNotification({ message: "Customer chat closed and saved to history.", type: "chat" });
  };

  const submitRating = async () => {
    if (!active?.id) return;
    let chat;
    try {
      const { data } = await api.post(`/chats/${active.id}/rating`, { rating: Number(rating), feedback });
      chat = data.data || data;
    } catch (error) {
      setNotice(error.friendlyMessage || "Rating failed.");
      return;
    }
    setActive(chat);
    setSessions((current) => current.map((item) => item.id === chat.id ? chat : item));
    setNotice("Thanks, your feedback was saved.");
    pushNotification({ message: `Customer submitted a ${rating}/5 chat rating.`, type: "rating" });
  };

  return (
    <>
      <PageHeader title={t("nav.liveChat")} description="Start a secure AI-assisted support chat, share files, and rate the experience." actions={<Button onClick={startChat}>{t("buttons.startChat")}</Button>} />
      {notice ? <p className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{notice}</p> : null}
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="flex flex-col overflow-hidden rounded-lg border border-slate-200 md:flex-row">
          <ChatSidebar sessions={sessions} activeId={active?.id} onSelect={setActive} />
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
          />
        </div>
        <Card className="p-5">
          <h2 className="font-semibold">{t("chat.ratingTitle")}</h2>
          <p className="mt-2 text-sm text-slate-500">{t("chat.ratingHelp")}</p>
          <select className="mt-4 h-11 w-full rounded-md border border-slate-200 px-3" value={rating} onChange={(event) => setRating(event.target.value)}>
            <option value="5">5 - Excellent</option><option value="4">4 - Good</option><option value="3">3 - Neutral</option><option value="2">2 - Poor</option><option value="1">1 - Bad</option>
          </select>
          <textarea className="mt-3 min-h-28 w-full rounded-md border border-slate-200 p-3" placeholder={t("chat.feedback")} value={feedback} onChange={(event) => setFeedback(event.target.value)} />
          <Button className="mt-3 w-full" onClick={submitRating}>{t("buttons.submitRating")}</Button>
        </Card>
      </div>
    </>
  );
}
