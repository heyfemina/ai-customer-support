import { useEffect, useRef } from "react";
import { Bot, LockKeyhole, Radio, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import Card from "../common/Card.jsx";
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
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
            <Badge tone={session.status === "WAITING" ? "amber" : session.status === "CLOSED" ? "slate" : "green"}>{session.status}</Badge>
            <span className="inline-flex items-center gap-1"><Radio className="h-3.5 w-3.5" /> Real-time</span>
            <span className="inline-flex items-center gap-1"><LockKeyhole className="h-3.5 w-3.5" /> Encrypted</span>
            <span className="inline-flex items-center gap-1"><Bot className="h-3.5 w-3.5" /> AI handoff ready</span>
            <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {session.agentName || "Queue team"}</span>
            <span>{session.language?.toUpperCase() || "EN"}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {onAiTransfer ? <Button variant="secondary" onClick={onAiTransfer}>Request agent</Button> : null}
          {onTransfer ? <Button variant="secondary" onClick={onTransfer}>{t("buttons.transfer")}</Button> : null}
          {onClose ? <Button variant="danger" onClick={onClose}>{t("buttons.close")}</Button> : null}
        </div>
      </div>
      <div className="app-scrollbar flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
        {messages.length ? messages.map((message) => <ChatMessage key={message.id} message={message} currentUserId={currentUserId} />) : <p className="rounded-md bg-white p-4 text-sm text-slate-500">No chat history yet. Messages and shared files will be stored here.</p>}
        {typingUsers.length ? <TypingIndicator name={typingUsers[0]?.name || "Someone"} /> : null}
        <div ref={endRef} />
      </div>
      <ChatInput onTyping={onTyping} onStopTyping={onStopTyping} onSend={onSend} />
    </Card>
  );
}
