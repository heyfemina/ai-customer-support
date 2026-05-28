import Badge from "../common/Badge.jsx";
import { cx, formatDate } from "../../utils/helpers.js";
import { useTranslation } from "react-i18next";
import { MessageCircle, Timer } from "lucide-react";

export default function ChatSidebar({ sessions, activeId, onSelect }) {
  const { t } = useTranslation();
  const waiting = sessions.filter((session) => session.status === "WAITING").length;
  return (
    <aside className="flex min-h-0 w-full flex-col border-b border-slate-200/80 bg-slate-50/70 md:h-full md:w-[22rem] md:shrink-0 md:border-b-0 md:border-r">
      <div className="shrink-0 border-b border-slate-200/80 bg-white/80 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-900">{t("chat.liveQueue")}</h2>
            <p className="mt-1 text-sm text-slate-500">{t("chat.activeConversations", { count: sessions.length })}</p>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-md bg-teal-50 text-teal-700 ring-1 ring-teal-100">
            <MessageCircle className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-semibold">
          <div className="rounded-md border border-amber-100 bg-amber-50 px-3 py-2 text-amber-700">
            <p className="text-lg font-bold">{waiting}</p>
            <p>Waiting</p>
          </div>
          <div className="rounded-md border border-teal-100 bg-teal-50 px-3 py-2 text-teal-700">
            <p className="text-lg font-bold">{sessions.length}</p>
            <p>Total</p>
          </div>
        </div>
      </div>
      <div className="app-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {sessions.length ? sessions.map((session) => (
          <button
            key={session.id}
            onClick={() => onSelect?.(session)}
            className={cx(
              "w-full rounded-lg border p-3 text-left transition hover:border-teal-200 hover:bg-white hover:shadow-sm",
              activeId === session.id ? "border-teal-200 bg-white shadow-sm ring-2 ring-teal-100" : "border-slate-200 bg-white/70"
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="truncate font-semibold text-slate-900">{session.customer?.name || session.customerName || "Customer"}</p>
              <Badge tone={session.status === "WAITING" ? "amber" : "green"}>{session.status}</Badge>
            </div>
            <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-500">{session.lastMessage || t("chat.noMessages")}</p>
            <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2 text-xs font-medium text-slate-400">
              <span className="inline-flex min-w-0 items-center gap-1"><Timer className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{formatDate(session.updatedAt || session.createdAt)}</span></span>
              <span className="max-w-full truncate rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">{session.channel || "Website"}</span>
              {session.queuePosition ? <span>Queue #{session.queuePosition}</span> : null}
            </div>
            {session.visitor ? <p className="mt-2 max-w-full truncate text-xs text-slate-400" title={`${session.visitor.page} - ${session.visitor.device}`}>{session.visitor.page} - {session.visitor.device}</p> : null}
          </button>
        )) : <div className="rounded-lg border border-dashed border-slate-200 bg-white/70 p-6 text-center text-sm text-slate-500">No live chats in queue.</div>}
      </div>
    </aside>
  );
}
