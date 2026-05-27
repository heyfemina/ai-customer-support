import Badge from "../common/Badge.jsx";
import { cx, formatDate } from "../../utils/helpers.js";
import { useTranslation } from "react-i18next";

export default function ChatSidebar({ sessions, activeId, onSelect }) {
  const { t } = useTranslation();
  const waiting = sessions.filter((session) => session.status === "WAITING").length;
  return (
    <aside className="w-full border-b border-slate-200 bg-white md:w-80 md:border-b-0 md:border-r">
      <div className="border-b border-slate-200 p-4">
        <h2 className="font-semibold text-slate-950">{t("chat.liveQueue")}</h2>
        <p className="text-sm text-slate-500">{t("chat.activeConversations", { count: sessions.length })} - {waiting} waiting</p>
      </div>
      <div className="app-scrollbar max-h-72 overflow-y-auto md:max-h-[calc(100vh-220px)]">
        {sessions.map((session) => (
          <button
            key={session.id}
            onClick={() => onSelect?.(session)}
            className={cx("w-full border-b border-slate-100 p-4 text-left hover:bg-slate-50", activeId === session.id && "bg-sky-50")}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-slate-900">{session.customer?.name || session.customerName}</p>
              <Badge tone={session.status === "WAITING" ? "amber" : "green"}>{session.status}</Badge>
            </div>
            <p className="mt-1 truncate text-sm text-slate-500">{session.lastMessage || t("chat.noMessages")}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span>{formatDate(session.updatedAt || session.createdAt)}</span>
              <span>{session.channel || "Website"}</span>
              {session.queuePosition ? <span>Queue #{session.queuePosition}</span> : null}
            </div>
            {session.visitor ? <p className="mt-1 truncate text-xs text-slate-400">{session.visitor.page} - {session.visitor.device}</p> : null}
          </button>
        ))}
      </div>
    </aside>
  );
}
