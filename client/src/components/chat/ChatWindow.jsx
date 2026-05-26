import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import Card from "../common/Card.jsx";
import Button from "../common/Button.jsx";
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
  onClose,
}) {
  const { t } = useTranslation();
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, session?.id]);

  if (!session) {
    return <Card className="grid min-h-[520px] flex-1 place-items-center p-6 text-sm text-slate-500">{t("chat.selectSession")}</Card>;
  }

  return (
    <Card className="flex min-h-[520px] flex-1 flex-col overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
        <div>
          <h2 className="font-semibold text-slate-950">{session.customer?.name || session.customerName || "Customer"}</h2>
          <p className="text-sm text-slate-500">{session.status} - {session.language?.toUpperCase() || "EN"} - {t("chat.aiHandoffReady")}</p>
        </div>
        <div className="flex gap-2">
          {onTransfer ? <Button variant="secondary" onClick={onTransfer}>{t("buttons.transfer")}</Button> : null}
          {onClose ? <Button variant="danger" onClick={onClose}>{t("buttons.close")}</Button> : null}
        </div>
      </div>
      <div className="app-scrollbar flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
        {messages.map((message) => <ChatMessage key={message.id} message={message} currentUserId={currentUserId} />)}
        {typingUsers.length ? <TypingIndicator name={typingUsers[0]?.name || "Someone"} /> : null}
        <div ref={endRef} />
      </div>
      <ChatInput onTyping={onTyping} onStopTyping={onStopTyping} onSend={onSend} />
    </Card>
  );
}
