import { Paperclip } from "lucide-react";
import { formatDate } from "../../utils/helpers.js";

export default function ChatMessage({ message, currentUserId }) {
  const mine = message.senderId === currentUserId || message.mine;

  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[78%] rounded-lg px-4 py-3 text-sm shadow-sm ${mine ? "bg-sky-600 text-white" : "bg-white text-slate-700 border border-slate-200"}`}>
        {message.fileUrl ? (
          <a href={message.fileUrl?.startsWith("http") ? message.fileUrl : `http://localhost:5000${message.fileUrl}`} target="_blank" rel="noreferrer" className="mb-2 flex items-center gap-2 font-semibold underline">
            <Paperclip className="h-4 w-4" />
            {message.fileName || "Attachment"}
          </a>
        ) : null}
        <p>{message.content}</p>
        <p className={`mt-1 text-[11px] ${mine ? "text-sky-100" : "text-slate-400"}`}>{formatDate(message.createdAt)}</p>
      </div>
    </div>
  );
}
