import { useEffect, useRef } from "react";
import { Bot, LockKeyhole, Radio, Send, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import Button from "../common/Button.jsx";
import Badge from "../common/Badge.jsx";
import ChatInput from "./ChatInput.jsx";
import ChatMessage from "./ChatMessage.jsx";
import TypingIndicator from "./TypingIndicator.jsx";

export default function ChatWindow({
  session,
  messages = [],
  currentUserId,
  typingUsers = [],
  onSend,
  onTyping,
  onStopTyping,
  onTransfer,
  onAiTransfer,
  onClose,
  aiTransferDisabled = false,
  aiTransferLoading = false,
  transferDisabled = false,
  closeDisabled = false,
  transferLoading = false,
  closeLoading = false,
}) {
  const { t } = useTranslation();
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, session?.id]);

  if (!session) {
    return <div className="grid min-h-[420px] flex-1 place-items-center bg-white p-6 text-center text-sm text-slate-500">{t("chat.selectSession")}</div>;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="shrink-0 border-b border-slate-200/80 bg-white px-4 py-4 sm:px-5">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-teal-600 text-sm font-bold text-white">
                {(session.customer?.name || session.customerName || "C").slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h2 className="truncate font-semibold text-slate-900">{session.customer?.name || session.customerName || t("chat.customerFallback")}</h2>
                <p className="mt-0.5 truncate text-xs font-medium text-slate-500">{t("chat.supportConversation", { channel: session.channel || t("chat.websiteChannel") })}</p>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
              <Badge tone={session.status === "WAITING" ? "amber" : session.status === "CLOSED" ? "slate" : "green"}>{session.status}</Badge>
              <span className="inline-flex items-center gap-1"><Radio className="h-3.5 w-3.5" /> {t("chat.realTime")}</span>
              <span className="inline-flex items-center gap-1"><LockKeyhole className="h-3.5 w-3.5" /> {t("chat.encrypted")}</span>
              <span className="inline-flex items-center gap-1"><Bot className="h-3.5 w-3.5" /> {t("chat.aiHandoffReady")}</span>
              <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {session.agentName || t("chat.queueTeam")}</span>
              <span>{session.language?.toUpperCase() || "EN"}</span>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {onAiTransfer ? <Button variant="secondary" onClick={onAiTransfer} loading={aiTransferLoading} disabled={aiTransferDisabled}>{t("chat.requestAgent")}</Button> : null}
            {onTransfer ? <Button variant="secondary" icon={Send} onClick={onTransfer} loading={transferLoading} disabled={transferDisabled}>{t("buttons.transfer")}</Button> : null}
            {onClose ? <Button variant="danger" onClick={onClose} loading={closeLoading} disabled={closeDisabled}>{t("buttons.close")}</Button> : null}
          </div>
        </div>
      </div>
      <div className="app-scrollbar flex-1 space-y-3 overflow-y-auto bg-gradient-to-b from-slate-50 via-white to-teal-50/40 p-4 sm:p-5">
        {messages.length ? messages.map((message) => <ChatMessage key={message.id} message={message} currentUserId={currentUserId} />) : <p className="rounded-lg border border-dashed border-slate-200 bg-white p-5 text-center text-sm text-slate-500">{t("chat.noHistory")}</p>}
        {typingUsers.length ? <TypingIndicator name={typingUsers[0]?.name || "Someone"} /> : null}
        <div ref={endRef} />
      </div>
      <ChatInput onTyping={onTyping} onStopTyping={onStopTyping} onSend={onSend} />
    </div>
  );
}
