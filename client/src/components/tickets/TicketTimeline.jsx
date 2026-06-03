import { useTranslation } from "react-i18next";
import Card from "../common/Card.jsx";
import { formatDate } from "../../utils/helpers.js";
import AttachmentList from "./AttachmentList.jsx";

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
        <AttachmentList attachments={attachments} />
        {messages.map((message) => (
          <div key={message.id} className="rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-slate-900">{message.sender?.name || "User"}</p>
              <span className="text-xs text-slate-500">{formatDate(message.createdAt)}</span>
            </div>
            <p className="mt-2 text-sm text-slate-700">{message.content}</p>
            <div className="mt-3"><AttachmentList attachments={message.attachments || (message.fileUrl ? [message] : [])} /></div>
          </div>
        ))}
      </div>
    </Card>
  );
}
