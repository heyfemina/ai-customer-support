import Badge from "../common/Badge.jsx";
import { cx, formatDate } from "../../utils/helpers.js";
import { useTranslation } from "react-i18next";
import { MessageCircle, Search, Timer } from "lucide-react";
import { useMemo, useState } from "react";

const statusTone = {
  WAITING: "amber",
  ACTIVE: "green",
  TRANSFERRED: "blue",
  CLOSED: "slate",
};

function customerName(session, fallback) {
  return session.customer?.name || session.customerName || fallback;
}

export default function ChatSidebar({ sessions, activeId, onSelect }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const waiting = sessions.filter((session) => session.status === "WAITING").length;
  const active = sessions.filter((session) => ["ACTIVE", "TRANSFERRED"].includes(session.status)).length;
  const filteredSessions = useMemo(() => {
    const search = query.trim().toLowerCase();
    return sessions.filter((session) => {
      const statusMatch = filter === "ALL" || session.status === filter;
      const haystack = `${customerName(session, "")} ${session.lastMessage || ""} ${session.channel || ""}`.toLowerCase();
      return statusMatch && (!search || haystack.includes(search));
    });
  }, [sessions, query, filter]);
  const filters = ["ALL", "WAITING", "ACTIVE", "TRANSFERRED", "CLOSED"];
  return (
    <aside className="flex min-h-0 w-full flex-col border-b border-slate-200 bg-white md:h-full md:w-[22rem] md:shrink-0 md:border-b-0 md:border-r xl:w-[24rem]">
      <div className="shrink-0 border-b border-slate-200/80 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-950">Support inbox</h2>
            <p className="mt-1 text-sm text-slate-500">{sessions.length} conversations</p>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-md bg-blue-50 text-blue-700 ring-1 ring-blue-100">
            <MessageCircle className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-xs font-semibold">
          <div className="rounded-md border border-amber-100 bg-amber-50 px-3 py-2 text-amber-700">
            <p className="text-lg font-bold">{waiting}</p>
            <p>{t("chat.waiting")}</p>
          </div>
          <div className="rounded-md border border-green-100 bg-green-50 px-3 py-2 text-green-700">
            <p className="text-lg font-bold">{active}</p>
            <p>{t("chat.active")}</p>
          </div>
          <div className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-blue-700">
            <p className="text-lg font-bold">{sessions.length}</p>
            <p>{t("chat.total")}</p>
          </div>
        </div>
        <div className="mt-4 flex h-10 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3">
          <Search className="h-4 w-4 text-slate-400" />
          <input className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none focus:shadow-none" placeholder="Search chats" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <div className="app-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
          {filters.map((item) => (
            <button
              key={item}
              type="button"
              className={cx(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition",
                filter === item ? "bg-blue-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-800"
              )}
              onClick={() => setFilter(item)}
            >
              {item === "ALL" ? "All" : item.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>
      <div className="app-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto bg-slate-50 p-3">
        {filteredSessions.length ? filteredSessions.map((session) => (
          <button
            key={session.id}
            onClick={() => onSelect?.(session)}
            className={cx(
              "w-full rounded-lg border bg-white p-3 text-left transition hover:border-blue-200 hover:shadow-sm",
              activeId === session.id ? "border-blue-300 shadow-sm ring-2 ring-blue-100" : "border-slate-200"
            )}
          >
            <div className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-900 text-xs font-bold text-white">
                {customerName(session, t("chat.customerFallback")).slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-semibold text-slate-950">{customerName(session, t("chat.customerFallback"))}</p>
                  <Badge tone={statusTone[session.status] || "slate"}>{session.status}</Badge>
                </div>
                <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-600">{session.lastMessage || t("chat.noMessages")}</p>
              </div>
            </div>
            <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
              <span className="inline-flex min-w-0 items-center gap-1"><Timer className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{formatDate(session.updatedAt || session.createdAt)}</span></span>
              <span className="max-w-full truncate rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">{session.channel || t("chat.websiteChannel")}</span>
              {session.queuePosition ? <span>{t("chat.queuePosition", { position: session.queuePosition })}</span> : null}
            </div>
          </button>
        )) : <div className="rounded-lg border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">{sessions.length ? "No chats match this filter." : t("chat.noLiveChats")}</div>}
      </div>
    </aside>
  );
}
