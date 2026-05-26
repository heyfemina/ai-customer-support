import { useEffect, useMemo, useState } from "react";
import api, { uploadFile } from "../../api/axios.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import ChatSidebar from "../../components/chat/ChatSidebar.jsx";
import ChatWindow from "../../components/chat/ChatWindow.jsx";
import Card from "../../components/common/Card.jsx";
import Button from "../../components/common/Button.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useSocket } from "../../context/SocketContext.jsx";
import { chats, messages } from "../../utils/dummyData.js";
import { normalizeItems } from "../../utils/helpers.js";
import { useTranslation } from "react-i18next";

export default function CustomerLiveChat() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { socket, connected } = useSocket();
  const [sessions, setSessions] = useState(chats.slice(0, 1));
  const [active, setActive] = useState(chats[0]);
  const [messagesByChat, setMessagesByChat] = useState({});
  const [typingUsers, setTypingUsers] = useState([]);
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState("");
  const activeMessages = useMemo(() => active?.messages?.length ? active.messages : messages, [active]);

  const loadChats = () => api.get("/chats").then(({ data }) => {
    const rows = normalizeItems(data, chats.slice(0, 1));
    setSessions(rows);
    setActive(rows[0] || null);
    setMessagesByChat(Object.fromEntries(rows.map((row) => [row.id, row.messages || []])));
  }).catch(() => null);

  useEffect(() => {
    loadChats();
  }, []);

  const startChat = async () => {
    const { data } = await api.post("/chats/start", { language: "en" });
    const session = data.data || data;
    setSessions((current) => [session, ...current]);
    setActive(session);
  };

  useEffect(() => {
    if (!socket || !active?.id) return undefined;
    socket.emit("join_chat", active.id);
    const receive = (message) => {
      if (message.chatSessionId !== active.id) return;
      setMessagesByChat((current) => ({ ...current, [active.id]: [...(current[active.id] || []), message] }));
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
    let filePayload = {};
    if (file) filePayload = await uploadFile(file);
    const payload = { content: content || filePayload.fileName || "Attachment", ...filePayload, chatSessionId: active.id, senderId: user?.id };
    if (connected) {
      socket.emit("send_message", payload);
    } else {
      const { data } = await api.post(`/chats/${active.id}/message`, payload);
      const message = data.data || data;
      setMessagesByChat((current) => ({ ...current, [active.id]: [...(current[active.id] || []), message] }));
    }
  };

  const closeChat = async () => {
    if (!active?.id) return;
    const { data } = await api.put(`/chats/${active.id}/close`);
    const chat = data.data || data;
    setActive(chat);
    setSessions((current) => current.map((item) => item.id === chat.id ? chat : item));
  };

  const submitRating = async () => {
    if (!active?.id) return;
    const { data } = await api.post(`/chats/${active.id}/rating`, { rating: Number(rating), feedback });
    const chat = data.data || data;
    setActive(chat);
    setSessions((current) => current.map((item) => item.id === chat.id ? chat : item));
  };

  return (
    <>
      <PageHeader title={t("nav.liveChat")} description="Start a secure AI-assisted support chat, share files, and rate the experience." actions={<Button onClick={startChat}>{t("buttons.startChat")}</Button>} />
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
