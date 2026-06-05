import { useEffect, useRef } from "react";
import { LockKeyhole, MessageCircle, Radio, Send, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import Button from "../common/Button.jsx";
import Badge from "../common/Badge.jsx";
import ChatInput from "./ChatInput.jsx";
import ChatMessage from "./ChatMessage.jsx";
import TypingIndicator from "./TypingIndicator.jsx";
import { languageOptions, useLanguage } from "../../context/LanguageContext.jsx";

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
  afterMessages = null,
}) {
  const { t } = useTranslation();
  const { language, changeLanguage } = useLanguage();
  const endRef = useRef(null);
  const sessionLanguage = session?.language?.toUpperCase() || language.toUpperCase();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, session?.id, afterMessages]);

  if (!session) {
    return <div className="grid min-h-[420px] flex-1 place-items-center bg-white p-6 text-center"><div className="max-w-sm rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6"><p className="font-semibold text-slate-900">{t("chat.selectSession")}</p><p className="mt-2 text-sm leading-6 text-slate-500">{t("chat.chooseConversation", { defaultValue: "Choose a conversation from the queue to view history and reply." })}</p></div></div>;
  }

  const viewingAsCustomer = currentUserId && session.customerId === currentUserId;
  const statusLabel = session.status === "ASSIGNED" || session.status === "ACTIVE" ? t("chat.connected", { defaultValue: "Connected" }) : session.status === "WAITING" ? t("chat.waiting") : session.status === "CLOSED" ? t("chat.closed") : t(`status.${session.status}`, { defaultValue: session.status });
  const headerName = viewingAsCustomer
    ? session.agent?.name || session.agentName || (session.status === "WAITING" ? t("chat.waitingForAgent", { defaultValue: "Waiting for agent" }) : t("chat.queueTeam"))
    : session.customer?.name || session.customerName || t("chat.customerFallback");
  const headerEmail = viewingAsCustomer ? session.agent?.email : session.customer?.email;
  const title = viewingAsCustomer ? t("chat.supportChat", { defaultValue: "Support Chat" }) : headerName;
  const subtitle = viewingAsCustomer
    ? session.agent?.name ? t("chat.connectedWith", { name: session.agent.name, defaultValue: `Connected with ${session.agent.name}` }) : t("chat.waitingForAvailableAgent", { defaultValue: "Waiting for available agent." })
    : [headerEmail, session.category || session.channel].filter(Boolean).join(" / ");
  const agentDisplay = session.agent?.name || session.agentName || t("chat.queueTeam");

  return (
    <div className="support-chat-window flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="support-chat-header shrink-0 border-b border-slate-200 bg-white px-4 py-3 sm:px-5">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-blue-600 text-sm font-bold text-white">
                {headerName.slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-slate-950">{title}</h2>
                <p className="mt-0.5 truncate text-xs font-medium text-slate-500">{subtitle}</p>
              </div>
            </div>
            <div className="mt-3 flex max-w-full flex-wrap items-center gap-1.5 text-xs font-semibold text-slate-500">
              <Badge tone={session.status === "WAITING" ? "amber" : session.status === "CLOSED" ? "slate" : "green"}>{statusLabel}</Badge>
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1"><Radio className="h-3.5 w-3.5" /> {t("chat.realTime")}</span>
              <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1"><LockKeyhole className="h-3.5 w-3.5" /> {t("chat.encrypted")}</span>
              <span className="inline-flex min-w-0 max-w-48 items-center gap-1 rounded-md bg-slate-100 px-2 py-1"><Users className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{agentDisplay}</span></span>
              <span className="rounded-md bg-blue-50 px-2 py-1 text-blue-700 ring-1 ring-blue-100">{sessionLanguage}</span>
              <select
                className="h-7 rounded-md border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                value={language}
                onChange={(event) => changeLanguage(event.target.value)}
                aria-label="Chat language"
              >
                {languageOptions.map((option) => <option key={option.code} value={option.code}>{option.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            {onAiTransfer ? <Button size="sm" variant="secondary" onClick={onAiTransfer} loading={aiTransferLoading} disabled={aiTransferDisabled}>{t("chat.requestAgent")}</Button> : null}
            {onTransfer ? <Button size="sm" variant="secondary" icon={Send} onClick={onTransfer} loading={transferLoading} disabled={transferDisabled}>{t("buttons.transfer")}</Button> : null}
            {onClose ? <Button size="sm" variant="danger" onClick={onClose} loading={closeLoading} disabled={closeDisabled}>{t("buttons.close")}</Button> : null}
          </div>
        </div>
      </div>
      <div className="support-message-wall app-scrollbar flex-1 space-y-3 overflow-y-auto bg-slate-50/80 p-4 sm:p-5">
        {session.status === "WAITING" ? <div className="mx-auto max-w-md rounded-lg border border-amber-100 bg-white p-4 text-center text-sm text-slate-600 shadow-sm"><p className="font-semibold text-slate-900">{t("chat.waitingForAvailableAgent")}</p><p className="mt-1 leading-6 text-slate-500">{t("chat.queueSaved", { defaultValue: "Your conversation is in the support queue. Messages are saved here while you wait." })}</p></div> : null}
        {messages.length ? messages.map((message) => <ChatMessage key={message.id} message={message} currentUserId={currentUserId} />) : (
          <div className="grid min-h-[18rem] place-items-center">
            <div className="max-w-md rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
              <div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-blue-50 text-blue-700 ring-1 ring-blue-100">
                <MessageCircle className="h-5 w-5" />
              </div>
              <p className="mt-3 font-semibold text-slate-950">{t("chat.noMessages")}</p>
              <p className="mt-1 leading-6">{t("chat.noHistory")}</p>
            </div>
          </div>
        )}
        {typingUsers.length ? <TypingIndicator name={typingUsers[0]?.name || "Someone"} /> : null}
        {afterMessages}
        <div ref={endRef} />
      </div>
      <ChatInput onTyping={onTyping} onStopTyping={onStopTyping} onSend={onSend} />
    </div>
  );
}
