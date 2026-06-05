import { MessageCircle, X } from "lucide-react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../../api/axios.js";
import Button from "../common/Button.jsx";
import { useLanguage } from "../../context/LanguageContext.jsx";
import { useSocket } from "../../context/SocketContext.jsx";

export default function AiChatBubble() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { language } = useLanguage();
  const { pushNotification } = useSocket();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const isCustomerLiveChat = location.pathname === "/customer/live-chat";

  const openAgentChat = async (content) => {
    const lastCustomerMessage = content || [...messages].reverse().find((message) => message.sender === "user")?.content;
    setTransferLoading(true);
    setNotice("");
    try {
      const visits = Number(localStorage.getItem("visitorVisits") || 0) + 1;
      localStorage.setItem("visitorVisits", String(visits));
      const { data } = await api.post("/chats/start", {
        language,
        channel: "AI chatbot handoff",
        visitorPage: window.location.pathname,
        visitorDevice: navigator.userAgent,
        visitorVisits: visits,
      });
      const session = data.data || data;
      if (lastCustomerMessage && session?.id) {
        await api.post(`/chats/${session.id}/message`, {
          chatSessionId: session.id,
          content: lastCustomerMessage,
        });
      }
      pushNotification?.({ message: t("chat.aiTransferred", { defaultValue: "AI transferred your conversation to an agent queue." }), type: "transfer" });
      setOpen(false);
      navigate("/customer/live-chat", { state: { chatId: session?.id } });
    } catch (error) {
      setNotice(error.friendlyMessage || t("chat.openLiveChatFailed", { defaultValue: "Could not open Live Chat. Please check the backend connection." }));
    } finally {
      setTransferLoading(false);
    }
  };

  const send = async (event) => {
    event.preventDefault();
    const content = text.trim();
    if (!content) return;
    setText("");
    setMessages((current) => [...current, { id: `u-${Date.now()}`, sender: "user", role: t("chat.you", { defaultValue: "You" }), content }]);
    setLoading(true);
    setNotice("");
    try {
      const { data } = await api.post("/ai/reply", { message: content, language });
      const ai = data.data || data;
      setMessages((current) => [...current, { id: `a-${Date.now()}`, sender: "ai", role: t("chat.aiBot"), content: ai.reply || t("chat.aiCanHelp", { defaultValue: "I can help with that." }), transferToAgent: ai.transferToAgent }]);
      if (ai.transferToAgent) {
        setNotice(t("chat.aiTransferring", { defaultValue: "AI is transferring this conversation to an agent." }));
        await openAgentChat(content);
      }
    } catch (error) {
      setMessages((current) => [...current, { id: `e-${Date.now()}`, sender: "ai", role: t("chat.aiBot"), content: error.friendlyMessage || t("chat.aiUnavailable", { defaultValue: "AI is unavailable right now." }) }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`fixed right-5 z-50 ${isCustomerLiveChat ? "bottom-24" : "bottom-5"}`}>
      {open ? (
        <div className="mb-3 flex h-[420px] w-[330px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between bg-blue-900 px-4 py-3 text-white">
            <div><p className="font-bold">{t("chat.aiBot")}</p><p className="text-xs text-blue-100">{t("chat.instantHelp", { defaultValue: "Instant help before agent chat" })}</p></div>
            <button type="button" className="grid h-9 w-9 place-items-center rounded-md border border-white/20 bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/40" onClick={() => setOpen(false)} aria-label={t("chat.closeAiChat", { defaultValue: "Close AI chat" })}><X className="h-5 w-5" /></button>
          </div>
          <div className="flex-1 space-y-3 overflow-auto bg-slate-50 p-3 text-sm">
            {messages.length ? messages.map((message) => (
              <div key={message.id} className={`rounded-md p-3 ${message.sender === "user" ? "ml-8 bg-blue-900 text-white" : "mr-8 border border-slate-200 bg-white text-slate-700"}`}>
                <p className="mb-1 text-xs font-bold">{message.role}</p>
                <p>{message.content}</p>
              </div>
            )) : <p className="rounded-md bg-white p-3 text-slate-500">{t("chat.askAnything", { defaultValue: "Hi, ask anything about your support request." })}</p>}
            {loading ? <p className="text-xs font-semibold text-slate-500">{t("chat.aiTyping", { defaultValue: "AI is typing..." })}</p> : null}
          </div>
          {notice ? <p className="border-t border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">{notice}</p> : null}
          <div className="border-t border-slate-200 bg-white px-3 py-2">
            <Button type="button" variant="secondary" className="w-full" loading={transferLoading} onClick={() => openAgentChat()}>{t("chat.continueLiveChat", { defaultValue: "Continue in Live Chat" })}</Button>
          </div>
          <form className="flex gap-2 border-t border-slate-200 p-3" onSubmit={send}>
            <input className="min-w-0 flex-1 rounded-md border border-slate-200 px-3 text-sm outline-none focus:border-blue-400" value={text} onChange={(event) => setText(event.target.value)} placeholder={t("chat.typeQuestion", { defaultValue: "Type your question" })} />
            <Button loading={loading}>{t("buttons.send", { defaultValue: "Send" })}</Button>
          </form>
        </div>
      ) : null}
      <button onClick={() => setOpen(!open)} className="grid h-14 w-14 place-items-center rounded-full border border-blue-800 bg-blue-900 text-white shadow-2xl shadow-blue-950/20 transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-200" aria-label={t("chat.openAiChat", { defaultValue: "Open AI chat" })}>
        <MessageCircle className="h-6 w-6" />
      </button>
    </div>
  );
}
