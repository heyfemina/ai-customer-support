import { Paperclip } from "lucide-react";
import { formatDate } from "../../utils/helpers.js";

export default function ChatMessage({ message, currentUserId }) {
  const mine = message.senderId === currentUserId || message.mine;
  const system = message.senderId === "system";
  const fileHref = message.fileUrl === "#" ? "#" : message.fileUrl?.startsWith("http") ? message.fileUrl : `http://localhost:5000${message.fileUrl}`;
  const imageFile = message.fileType?.startsWith("image/") || /\.(png|jpe?g|gif|webp)$/i.test(message.fileName || "");

  if (system) {
    return (
      <div className="flex justify-center">
        <div className="max-w-[86%] rounded-md bg-slate-200 px-3 py-2 text-center text-xs font-semibold text-slate-600">
          {message.content}
          <span className="ml-2 font-normal text-slate-500">{formatDate(message.createdAt)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[78%] rounded-lg px-4 py-3 text-sm shadow-sm ${mine ? "bg-sky-600 text-white" : "bg-white text-slate-700 border border-slate-200"}`}>
        {message.fileUrl ? (
          <div className="mb-2">
            {imageFile && fileHref !== "#" ? <img src={fileHref} alt={message.fileName || "Shared image"} className="mb-2 max-h-44 rounded-md object-cover" /> : null}
            <a href={fileHref} target="_blank" rel="noreferrer" className="flex items-center gap-2 font-semibold underline">
              <Paperclip className="h-4 w-4" />
              {message.fileName || "Attachment"}
            </a>
          </div>
        ) : null}
        <p>{message.content}</p>
        <p className={`mt-1 text-[11px] ${mine ? "text-sky-100" : "text-slate-400"}`}>{formatDate(message.createdAt)}</p>
      </div>
    </div>
  );
}
