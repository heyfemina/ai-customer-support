import { useEffect, useMemo, useState } from "react";
import api, { uploadFile } from "../../api/axios.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import ChatSidebar from "../../components/chat/ChatSidebar.jsx";
import ChatWindow from "../../components/chat/ChatWindow.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useSocket } from "../../context/SocketContext.jsx";
import { normalizeItems } from "../../utils/helpers.js";
import Card from "../../components/common/Card.jsx";
import Button from "../../components/common/Button.jsx";
import { useTranslation } from "react-i18next";

const appendMessage = (current, chatId, message) => {
  const existing = current[chatId] || [];
  if (existing.some((item) => item.id === message.id)) return current;
  return { ...current, [chatId]: [...existing, message] };
};

export default function Chats() {
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
    closed: sessions.filter((session) => session.status === "CLOSED").length,
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
          setNotice(response?.message || "Message failed. Please check the backend connection.");
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
        setNotice(error.friendlyMessage || "Message failed. Please check the backend connection.");
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
    if (!active?.id || !transferAgentId) return;
    let chat;
    try {
      const { data } = await api.post(`/chats/${active.id}/transfer`, { agentId: transferAgentId });
      chat = data.data || data;
    } catch (error) {
      setNotice(error.friendlyMessage || "Transfer failed. Please check the backend connection.");
      return;
    }
    setActive(chat);
    setSessions((current) => current.map((item) => item.id === chat.id ? chat : item));
    pushNotification({ message: "Admin transferred a chat.", type: "transfer" });
  };

  const closeChat = async () => {
    if (!active?.id) return;
    let chat;
    try {
      const { data } = await api.put(`/chats/${active.id}/close`);
      chat = data.data || data;
    } catch (error) {
      setNotice(error.friendlyMessage || "Close failed. Please check the backend connection.");
      return;
    }
    setActive(chat);
    setSessions((current) => current.map((item) => item.id === chat.id ? chat : item));
    pushNotification({ message: "Admin closed a chat transcript.", type: "chat" });
  };

  return (
    <>
      <PageHeader title="Chat monitoring" description="Monitor live conversations, AI-to-agent handoffs, queues, notifications, and visitor sessions." />
      {notice ? <p className="mb-4 rounded-md bg-amber-50 p-3 text-sm font-semibold text-amber-800">{notice}</p> : null}
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
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
            onTransfer={transferChat}
            onClose={closeChat}
          />
        </div>
        <Card className="p-5">
          <h2 className="font-semibold text-slate-950">{t("ticketsUi.workflow")}</h2>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-md bg-amber-50 p-2 font-semibold text-amber-700"><p>{queueStats.waiting}</p><p>Waiting</p></div>
            <div className="rounded-md bg-emerald-50 p-2 font-semibold text-emerald-700"><p>{queueStats.active}</p><p>Active</p></div>
            <div className="rounded-md bg-slate-100 p-2 font-semibold text-slate-700"><p>{queueStats.closed}</p><p>Closed</p></div>
          </div>
          <label className="mt-4 block">
            <span className="text-sm font-semibold text-slate-700">{t("chat.transferTo")}</span>
            <select className="mt-1 h-11 w-full rounded-md border border-slate-200 px-3" value={transferAgentId} onChange={(event) => setTransferAgentId(event.target.value)}>
              <option value="">{t("ticketsUi.unassigned")}</option>
              {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
            </select>
          </label>
          <Button variant="secondary" className="mt-3 w-full" onClick={transferChat}>{t("buttons.transfer")}</Button>
          <Button variant="danger" className="mt-3 w-full" onClick={closeChat}>{t("buttons.close")}</Button>
          <div className="mt-5 border-t border-slate-200 pt-4">
            <h3 className="text-sm font-semibold text-slate-950">Visitor and security</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div><dt className="text-slate-500">Visitor page</dt><dd className="font-semibold">{active?.visitor?.page || "/support"}</dd></div>
              <div><dt className="text-slate-500">Device</dt><dd className="font-semibold">{active?.visitor?.device || "Desktop Chrome"}</dd></div>
              <div><dt className="text-slate-500">Channel</dt><dd className="font-semibold">{active?.channel || "Website chatbot"}</dd></div>
              <div><dt className="text-slate-500">Encryption</dt><dd className="font-semibold">Enabled</dd></div>
            </dl>
          </div>
        </Card>
      </div>
    </>
  );
}
