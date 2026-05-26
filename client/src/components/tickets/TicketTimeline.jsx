import { Paperclip } from "lucide-react";
import { useTranslation } from "react-i18next";
import Card from "../common/Card.jsx";
import { formatDate } from "../../utils/helpers.js";

export default function TicketTimeline({ ticket }) {
  const { t } = useTranslation();
  const messages = ticket?.messages || [];
  const attachments = ticket?.attachments || [];

  return (
    <Card className="p-5">
      <h2 className="font-semibold text-slate-950">{t("ticketsUi.replyTimeline")}</h2>
      <div className="mt-4 space-y-4">
        <div className="rounded-lg bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold text-slate-900">{ticket?.customer?.name || "Customer"}</p>
            <span className="text-xs text-slate-500">{formatDate(ticket?.createdAt)}</span>
          </div>
          <p className="mt-2 text-sm text-slate-700">{ticket?.description}</p>
        </div>
        {attachments.map((file) => (
          <a key={file.id || file.fileUrl} href={`http://localhost:5000${file.fileUrl}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-md border border-slate-200 p-3 text-sm font-semibold text-sky-700">
            <Paperclip className="h-4 w-4" />
            {file.fileName}
          </a>
        ))}
        {messages.map((message) => (
          <div key={message.id} className="rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-slate-900">{message.sender?.name || "User"}</p>
              <span className="text-xs text-slate-500">{formatDate(message.createdAt)}</span>
            </div>
            <p className="mt-2 text-sm text-slate-700">{message.content}</p>
            {message.fileUrl ? (
              <a href={`http://localhost:5000${message.fileUrl}`} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-sky-700">
                <Paperclip className="h-4 w-4" />
                Open attachment
              </a>
            ) : null}
          </div>
        ))}
      </div>
    </Card>
  );
}
