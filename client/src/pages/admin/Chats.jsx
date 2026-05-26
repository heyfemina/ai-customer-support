import { useEffect, useMemo, useState } from "react";
import api, { uploadFile } from "../../api/axios.js";
import PageHeader from "../../components/common/PageHeader.jsx";
import ChatSidebar from "../../components/chat/ChatSidebar.jsx";
import ChatWindow from "../../components/chat/ChatWindow.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useSocket } from "../../context/SocketContext.jsx";
import { chats, messages } from "../../utils/dummyData.js";
import { normalizeItems } from "../../utils/helpers.js";
import Card from "../../components/common/Card.jsx";
import Button from "../../components/common/Button.jsx";
import { useTranslation } from "react-i18next";

export default function Chats() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { socket, connected } = useSocket();
  const [sessions, setSessions] = useState(chats);
  const [active, setActive] = useState(chats[0]);
  const [messagesByChat, setMessagesByChat] = useState({});
  const [typingUsers, setTypingUsers] = useState([]);
  const [agents, setAgents] = useState([]);
  const [transferAgentId, setTransferAgentId] = useState("");
  const activeMessages = useMemo(() => active?.messages?.length ? active.messages : messages, [active]);

  useEffect(() => {
    api.get("/chats").then(({ data }) => {
      const rows = normalizeItems(data, chats);
      setSessions(rows);
      setActive(rows[0] || null);
      setMessagesByChat(Object.fromEntries(rows.map((row) => [row.id, row.messages || []])));
    }).catch(() => null);
    api.get("/reports/agents").then(({ data }) => setAgents(normalizeItems(data, []))).catch(() => setAgents([]));
  }, []);

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

  const transferChat = async () => {
    if (!active?.id || !transferAgentId) return;
    const { data } = await api.post(`/chats/${active.id}/transfer`, { agentId: transferAgentId });
    const chat = data.data || data;
    setActive(chat);
    setSessions((current) => current.map((item) => item.id === chat.id ? chat : item));
  };

  const closeChat = async () => {
    if (!active?.id) return;
    const { data } = await api.put(`/chats/${active.id}/close`);
    const chat = data.data || data;
    setActive(chat);
    setSessions((current) => current.map((item) => item.id === chat.id ? chat : item));
  };

  return (
    <>
      <PageHeader title="Chat monitoring" description="Monitor live conversations, AI-to-agent handoffs, queues, notifications, and visitor sessions." />
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
          <label className="mt-4 block">
            <span className="text-sm font-semibold text-slate-700">{t("chat.transferTo")}</span>
            <select className="mt-1 h-11 w-full rounded-md border border-slate-200 px-3" value={transferAgentId} onChange={(event) => setTransferAgentId(event.target.value)}>
              <option value="">{t("ticketsUi.unassigned")}</option>
              {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
            </select>
          </label>
          <Button variant="secondary" className="mt-3 w-full" onClick={transferChat}>{t("buttons.transfer")}</Button>
          <Button variant="danger" className="mt-3 w-full" onClick={closeChat}>{t("buttons.close")}</Button>
        </Card>
      </div>
    </>
  );
}
