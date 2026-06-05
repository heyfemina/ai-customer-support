import { Download, Paperclip } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { formatDate, resolveFileUrl } from "../../utils/helpers.js";

export default function ChatMessage({ message, currentUserId }) {
  const { t } = useTranslation();
  const [showOriginal, setShowOriginal] = useState(false);
  const senderId = message.senderId || message.sender?.id;
  const mine = !message.isAI && (message.mine === true || Boolean(currentUserId && senderId && senderId === currentUserId));
  const system = message.senderId === "system";
  const fileHref = resolveFileUrl(message.fileUrl);
  const displayFileName = message.fileName || message.content || t("chat.attachment");
  const imageFile = message.fileType?.startsWith("image/") || message.messageType === "IMAGE" || /\.(png|jpe?g|gif|webp)$/i.test(displayFileName);
  const hasTranslation = Boolean(message.translatedContent && message.translatedContent !== message.originalContent);
  const body = hasTranslation && !showOriginal ? message.translatedContent : message.content;
  const senderName = mine ? t("chat.you", { defaultValue: "You" }) : message.sender?.name || message.senderName || t("chat.support", { defaultValue: "Support" });
  const senderRole = !mine && message.sender?.role ? message.sender.role : "";

  if (system) {
    return (
      <div className="flex justify-center">
        <div className="max-w-[86%] rounded-full border border-slate-200 bg-white px-3 py-2 text-center text-xs font-semibold leading-5 text-slate-600 shadow-sm">
          {message.content}
          <span className="ml-2 font-normal text-slate-500">{formatDate(message.createdAt)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}>
      {!mine ? (
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-xs font-bold text-blue-700 ring-1 ring-blue-100 shadow-sm">
          {senderName.slice(0, 1).toUpperCase()}
        </div>
      ) : null}
      <div className={`max-w-[88%] overflow-hidden rounded-2xl px-4 py-3 text-sm shadow-sm sm:max-w-[82%] xl:max-w-[74%] ${mine ? "rounded-br-md bg-blue-600 text-white shadow-blue-600/15" : "rounded-bl-md border border-slate-200 bg-white text-slate-700 shadow-slate-200/70"}`}>
        {message.fileUrl ? (
          <div className="mb-2">
            {imageFile && fileHref !== "#" ? <img src={fileHref} alt={message.fileName || t("chat.sharedImage")} className={`mb-2 max-h-64 w-full rounded-xl object-contain ring-1 ${mine ? "bg-blue-700 ring-white/15" : "bg-slate-50 ring-slate-200"}`} loading="lazy" /> : null}
            <a href={fileHref} target="_blank" rel="noreferrer" download={displayFileName} className={`flex min-w-0 items-center gap-2 rounded-xl px-3 py-2 font-semibold no-underline transition ${mine ? "bg-blue-700 text-white hover:bg-blue-800" : "bg-slate-50 text-blue-700 hover:bg-blue-50"}`}>
              {imageFile ? <Paperclip className="h-4 w-4 shrink-0" /> : <Download className="h-4 w-4 shrink-0" />}
              <span className="truncate">{displayFileName}</span>
            </a>
          </div>
        ) : null}
        <div className="mb-1.5 flex min-w-0 items-center justify-between gap-3">
          <p className={`min-w-0 truncate text-[11px] font-bold uppercase ${mine ? "text-blue-50" : "text-blue-700"}`}>{senderName}{senderRole ? ` - ${senderRole}` : ""}</p>
          <p className={`shrink-0 text-[11px] ${mine ? "text-blue-100" : "text-slate-400"}`}>{formatDate(message.createdAt)}</p>
        </div>
        {hasTranslation ? (
          <div className="mb-1 flex flex-wrap items-center gap-2">
            {message.sourceLanguage ? <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${mine ? "bg-blue-800 text-blue-50" : "bg-slate-100 text-slate-500"}`}>{message.sourceLanguage}</span> : null}
            {message.targetLanguage && message.targetLanguage !== message.sourceLanguage ? <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${mine ? "bg-blue-800 text-blue-50" : "bg-slate-100 text-slate-500"}`}>{message.targetLanguage}</span> : null}
          </div>
        ) : null}
        <p className="whitespace-pre-wrap break-words leading-6">{body}</p>
        {hasTranslation ? <button className={`mt-2 inline-flex min-h-8 items-center rounded-md border px-2.5 text-xs font-semibold no-underline transition ${mine ? "border-white/20 bg-white/10 text-white hover:bg-white/15" : "border-blue-200 bg-blue-50 text-blue-800 hover:border-blue-300 hover:bg-blue-100"}`} onClick={() => setShowOriginal(!showOriginal)}>{showOriginal ? t("chat.showTranslation") : t("chat.showOriginal")}</button> : null}
      </div>
    </div>
  );
}
