import { MessageCircle, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
  const [position, setPosition] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("aiChatBubblePosition") || "null");
    } catch {
      return null;
    }
  });
  const dragRef = useRef(null);
  const isCustomerLiveChat = location.pathname === "/customer/live-chat";
  const isMobile = useMemo(() => typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches, []);

  useEffect(() => {
    if (isMobile || position) return;
    setPosition({ x: window.innerWidth - 370, y: isCustomerLiveChat ? window.innerHeight - 510 : window.innerHeight - 430 });
  }, [isCustomerLiveChat, isMobile, position]);

  const clampPosition = (next) => {
    const width = open ? 350 : 64;
    const height = open ? 500 : 64;
    return {
      x: Math.min(Math.max(12, next.x), Math.max(12, window.innerWidth - width - 12)),
      y: Math.min(Math.max(12, next.y), Math.max(12, window.innerHeight - height - 12)),
    };
  };

  const startDrag = (event) => {
    if (isMobile) return;
    const rect = event.currentTarget.closest("[data-ai-chat-shell]")?.getBoundingClientRect();
    dragRef.current = {
      dx: event.clientX - (rect?.left || position?.x || 0),
      dy: event.clientY - (rect?.top || position?.y || 0),
    };
    window.addEventListener("pointermove", moveDrag);
    window.addEventListener("pointerup", stopDrag, { once: true });
  };

  const moveDrag = (event) => {
    if (!dragRef.current) return;
    const next = clampPosition({ x: event.clientX - dragRef.current.dx, y: event.clientY - dragRef.current.dy });
    setPosition(next);
    sessionStorage.setItem("aiChatBubblePosition", JSON.stringify(next));
  };

  const stopDrag = () => {
    dragRef.current = null;
    window.removeEventListener("pointermove", moveDrag);
  };

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
    <div
      data-ai-chat-shell
      className={`fixed z-50 ${isMobile || !position ? `right-5 ${isCustomerLiveChat ? "bottom-24" : "bottom-5"}` : ""}`}
      style={!isMobile && position ? { left: `${position.x}px`, top: `${position.y}px` } : undefined}
    >
      {open ? (
        <div className="mb-3 flex h-[420px] w-[330px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl">
          <div className="flex cursor-move items-center justify-between bg-blue-900 px-4 py-3 text-white" onPointerDown={startDrag}>
            <div><p className="font-bold">{t("chat.aiBot")}</p><p className="text-xs text-blue-100">{t("chat.instantHelp", { defaultValue: "Instant help before agent chat" })}</p></div>
            <button type="button" className="grid h-9 w-9 place-items-center rounded-md border border-white/20 bg-white/10 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/40" onPointerDown={(event) => event.stopPropagation()} onClick={() => setOpen(false)} aria-label={t("chat.closeAiChat", { defaultValue: "Close AI chat" })}><X className="h-5 w-5" /></button>
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
      <button onPointerDown={!open ? startDrag : undefined} onClick={() => setOpen(!open)} className="grid h-14 w-14 place-items-center rounded-full border border-blue-800 bg-blue-900 text-white shadow-2xl shadow-blue-950/20 transition hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-200" aria-label={t("chat.openAiChat", { defaultValue: "Open AI chat" })}>
        <MessageCircle className="h-6 w-6" />
      </button>
    </div>
  );
}
