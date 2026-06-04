import { Download, Paperclip } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { formatDate } from "../../utils/helpers.js";

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const serverUrl = (import.meta.env.VITE_SERVER_URL || import.meta.env.VITE_SOCKET_URL || apiUrl.replace(/\/api\/?$/, "")).replace(/\/$/, "");

export default function ChatMessage({ message, currentUserId }) {
  const { t } = useTranslation();
  const [showOriginal, setShowOriginal] = useState(false);
  const senderId = message.senderId || message.sender?.id;
  const mine = !message.isAI && (message.mine === true || Boolean(currentUserId && senderId && senderId === currentUserId));
  const system = message.senderId === "system";
  const fileHref = message.fileUrl === "#" ? "#" : message.fileUrl?.startsWith("http") || message.fileUrl?.startsWith("data:") ? message.fileUrl : `${serverUrl}${message.fileUrl}`;
  const displayFileName = message.fileName || message.content || t("chat.attachment");
  const imageFile = message.fileType?.startsWith("image/") || message.messageType === "IMAGE" || /\.(png|jpe?g|gif|webp)$/i.test(displayFileName);
  const hasTranslation = Boolean(message.translatedContent && message.translatedContent !== message.originalContent);
  const body = hasTranslation && !showOriginal ? message.translatedContent : message.content;
  const senderName = mine ? "You" : message.sender?.name || message.senderName || "Support";
  const senderRole = !mine && message.sender?.role ? message.sender.role : "";

  if (system) {
    return (
      <div className="flex justify-center">
        <div className="max-w-[86%] rounded-md bg-slate-200/80 px-3 py-2 text-center text-xs font-semibold leading-5 text-slate-600">
          {message.content}
          <span className="ml-2 font-normal text-slate-500">{formatDate(message.createdAt)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[88%] overflow-hidden rounded-xl px-3.5 py-2.5 text-sm shadow-sm sm:max-w-[82%] xl:max-w-[76%] ${mine ? "rounded-br-md bg-blue-600 text-white shadow-blue-600/10" : "rounded-bl-md border border-slate-200 bg-white text-slate-700"}`}>
        {message.fileUrl ? (
          <div className="mb-2">
            {imageFile && fileHref !== "#" ? <img src={fileHref} alt={message.fileName || t("chat.sharedImage")} className="mb-2 h-36 w-full rounded-md object-cover" /> : null}
            <a href={fileHref} target="_blank" rel="noreferrer" className={`flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 font-semibold no-underline ${mine ? "bg-blue-700 text-white" : "bg-slate-50 text-blue-700"}`}>
              {imageFile ? <Paperclip className="h-4 w-4 shrink-0" /> : <Download className="h-4 w-4 shrink-0" />}
              <span className="truncate">{displayFileName}</span>
            </a>
          </div>
        ) : null}
        <p className={`mb-1 text-[11px] font-bold uppercase ${mine ? "text-blue-50" : "text-blue-700"}`}>{senderName}{senderRole ? ` - ${senderRole}` : ""}</p>
        {hasTranslation ? (
          <div className="mb-1 flex flex-wrap items-center gap-2">
            {message.sourceLanguage ? <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${mine ? "bg-blue-800 text-blue-50" : "bg-slate-100 text-slate-500"}`}>{message.sourceLanguage}</span> : null}
            {message.targetLanguage && message.targetLanguage !== message.sourceLanguage ? <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${mine ? "bg-blue-800 text-blue-50" : "bg-slate-100 text-slate-500"}`}>{message.targetLanguage}</span> : null}
          </div>
        ) : null}
        <p className="whitespace-pre-wrap break-words leading-6">{body}</p>
        {hasTranslation ? <button className={`mt-2 inline-flex min-h-8 items-center rounded-md border px-2.5 text-xs font-semibold no-underline transition ${mine ? "border-white/20 bg-white/10 text-white hover:bg-white/15" : "border-blue-200 bg-blue-50 text-blue-800 hover:border-blue-300 hover:bg-blue-100"}`} onClick={() => setShowOriginal(!showOriginal)}>{showOriginal ? t("chat.showTranslation") : t("chat.showOriginal")}</button> : null}
        <p className={`mt-1 text-[11px] ${mine ? "text-blue-100" : "text-slate-400"}`}>{formatDate(message.createdAt)}</p>
      </div>
    </div>
  );
}
