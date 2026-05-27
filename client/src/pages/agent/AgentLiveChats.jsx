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
import { demoStore } from "../../utils/demoStore.js";

export default function AgentLiveChats() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { socket, connected } = useSocket();
  const [sessions, setSessions] = useState(chats);
  const [active, setActive] = useState(chats[0]);
  const [messagesByChat, setMessagesByChat] = useState({});
  const [typingUsers, setTypingUsers] = useState([]);
  const [agents, setAgents] = useState([]);
  const [transferAgentId, setTransferAgentId] = useState("");
  const [notice, setNotice] = useState("");
  const activeMessages = useMemo(() => active?.messages?.length ? active.messages : messages, [active]);
  const queueStats = {
    waiting: sessions.filter((session) => session.status === "WAITING").length,
    active: sessions.filter((session) => session.status === "ACTIVE").length,
    transferred: sessions.filter((session) => session.status === "TRANSFERRED").length,
  };

  useEffect(() => {
    api.get("/chats").then(({ data }) => {
      const rows = normalizeItems(data, demoStore.chats());
      setSessions(rows);
      setActive(rows[0] || null);
      setMessagesByChat(Object.fromEntries(rows.map((row) => [row.id, row.messages || []])));
    }).catch(() => {
      const rows = demoStore.chats();
      setSessions(rows);
      setActive(rows[0] || null);
      setMessagesByChat(Object.fromEntries(rows.map((row) => [row.id, row.messages || []])));
    });
    api.get("/reports/agents").then(({ data }) => setAgents(normalizeItems(data, []))).catch(() => setAgents(demoStore.users().filter((item) => item.role === "AGENT")));
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
      let message;
      try {
        const { data } = await api.post(`/chats/${active.id}/message`, payload);
        message = data.data || data;
      } catch {
        const result = demoStore.addChatMessage(active.id, { ...payload, mine: true });
        message = result.message;
        setActive(result.chat);
        setSessions((current) => current.map((item) => item.id === result.chat.id ? result.chat : item));
      }
      setMessagesByChat((current) => ({ ...current, [active.id]: [...(current[active.id] || []), message] }));
    }
  };

  const acceptChat = async () => {
    if (!active?.id) return;
    let chat;
    try {
      const { data } = await api.post(`/chats/${active.id}/accept`);
      chat = data.data || data;
    } catch {
      chat = demoStore.updateChat(active.id, { status: "ACTIVE", agentId: user?.id, agentName: user?.name });
      const event = demoStore.addChatEvent(active.id, `${user?.name || "Agent"} accepted the chat.`).message;
      setMessagesByChat((current) => ({ ...current, [active.id]: [...(current[active.id] || []), event] }));
    }
    setActive(chat);
    setSessions((current) => current.map((item) => item.id === chat.id ? chat : item));
    setNotice("Chat accepted. Customer can continue in real time.");
  };

  const transferChat = async () => {
    if (!active?.id || !transferAgentId) return;
    let chat;
    try {
      const { data } = await api.post(`/chats/${active.id}/transfer`, { agentId: transferAgentId });
      chat = data.data || data;
    } catch {
      const agent = agents.find((item) => item.id === transferAgentId);
      chat = demoStore.updateChat(active.id, { status: "TRANSFERRED", agentId: transferAgentId, agentName: agent?.name });
      const event = demoStore.addChatEvent(active.id, `Chat transferred to ${agent?.name || "another agent"}.`).message;
      setMessagesByChat((current) => ({ ...current, [active.id]: [...(current[active.id] || []), event] }));
    }
    setActive(chat);
    setSessions((current) => current.map((item) => item.id === chat.id ? chat : item));
    setNotice("Chat transferred.");
  };

  const closeChat = async () => {
    if (!active?.id) return;
    let chat;
    try {
      const { data } = await api.put(`/chats/${active.id}/close`);
      chat = data.data || data;
    } catch {
      chat = demoStore.updateChat(active.id, { status: "CLOSED" });
      const event = demoStore.addChatEvent(active.id, "Chat closed by support.").message;
      setMessagesByChat((current) => ({ ...current, [active.id]: [...(current[active.id] || []), event] }));
    }
    setActive(chat);
    setSessions((current) => current.map((item) => item.id === chat.id ? chat : item));
    setNotice("Chat closed and stored in history.");
  };

  return (
    <>
      <PageHeader title="Live chat queue" description="Accept live chats, transfer conversations, view history, and send secure messages." />
      {notice ? <p className="mb-4 rounded-md bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">{notice}</p> : null}
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
            <div className="rounded-md bg-violet-50 p-2 font-semibold text-violet-700"><p>{queueStats.transferred}</p><p>Transfers</p></div>
          </div>
          <Button className="mt-4 w-full" onClick={acceptChat}>{t("buttons.accept")}</Button>
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
            <h3 className="text-sm font-semibold text-slate-950">Multi-agent support</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {agents.map((agent) => <span key={agent.id} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{agent.name}</span>)}
            </div>
          </div>
          <div className="mt-5 border-t border-slate-200 pt-4">
            <h3 className="text-sm font-semibold text-slate-950">Visitor tracking</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div><dt className="text-slate-500">Page</dt><dd className="font-semibold">{active?.visitor?.page || "/support"}</dd></div>
              <div><dt className="text-slate-500">Device</dt><dd className="font-semibold">{active?.visitor?.device || "Desktop Chrome"}</dd></div>
              <div><dt className="text-slate-500">Visits</dt><dd className="font-semibold">{active?.visitor?.visits || 1}</dd></div>
              <div><dt className="text-slate-500">Security</dt><dd className="font-semibold">Encrypted transcript</dd></div>
            </dl>
          </div>
        </Card>
      </div>
    </>
  );
}
