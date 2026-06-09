import Badge from "../common/Badge.jsx";
import { cx, formatDate } from "../../utils/helpers.js";
import { useTranslation } from "react-i18next";
import { MessageCircle, Search, Timer, UserRound } from "lucide-react";
import { useMemo, useState } from "react";

const statusTone = {
  WAITING: "amber",
  ASSIGNED: "blue",
  ACTIVE: "green",
  TRANSFERRED: "blue",
  CLOSED: "slate",
};

function customerName(session, fallback) {
  return session.customer?.name || session.customerName || fallback;
}

function agentName(session, fallback) {
  return session.agent?.name || session.agentName || fallback;
}

function chatTitle(session, viewMode, fallback) {
  if (viewMode === "customer") return agentName(session, "Waiting for agent");
  if (viewMode === "admin") {
    const customer = customerName(session, fallback);
    const agent = agentName(session, "Unassigned");
    return `${customer} / ${agent}`;
  }
  return customerName(session, fallback);
}

export default function ChatSidebar({ sessions, activeId, onSelect, showMetrics = true, viewMode = "agent" }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const waiting = sessions.filter((session) => session.status === "WAITING").length;
  const active = sessions.filter((session) => ["ASSIGNED", "ACTIVE", "TRANSFERRED"].includes(session.status)).length;
  const filteredSessions = useMemo(() => {
    const search = query.trim().toLowerCase();
    return sessions.filter((session) => {
      const statusMatch = filter === "ALL" || (filter === "ACTIVE" ? ["ASSIGNED", "ACTIVE"].includes(session.status) : session.status === filter);
      const haystack = `${customerName(session, "")} ${agentName(session, "")} ${session.lastMessage || ""} ${session.channel || ""} ${session.category || ""}`.toLowerCase();
      return statusMatch && (!search || haystack.includes(search));
    });
  }, [sessions, query, filter]);
  const filters = ["ALL", "WAITING", "ACTIVE", "TRANSFERRED", "CLOSED"];
  const filterCounts = {
    ALL: sessions.length,
    WAITING: waiting,
    ACTIVE: sessions.filter((session) => ["ASSIGNED", "ACTIVE"].includes(session.status)).length,
    TRANSFERRED: sessions.filter((session) => session.status === "TRANSFERRED").length,
    CLOSED: sessions.filter((session) => session.status === "CLOSED").length,
  };

  return (
    <aside className="support-queue-panel flex min-h-0 w-full flex-col border-b border-slate-200 bg-white md:h-full md:w-[20rem] md:shrink-0 md:border-b-0 md:border-r lg:w-[21rem]">
      <div className="support-queue-header shrink-0 border-b border-slate-200 bg-white p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-blue-700">Live inbox</p>
            <h2 className="mt-0.5 text-sm font-semibold text-slate-950">Support queue</h2>
          </div>
          <div className="grid h-9 w-9 place-items-center rounded-md bg-blue-50 text-blue-700 ring-1 ring-blue-100">
            <MessageCircle className="h-4 w-4" />
          </div>
        </div>
        {showMetrics ? (
          <div className="support-sidebar-metrics mt-3 grid grid-cols-3 gap-1.5 text-xs font-semibold">
            <div>
              <p>{waiting}</p>
              <span>{t("chat.waiting")}</span>
            </div>
            <div>
              <p>{active}</p>
              <span>{t("chat.active")}</span>
            </div>
            <div>
              <p>{sessions.length}</p>
              <span>{t("chat.total")}</span>
            </div>
          </div>
        ) : null}
        <div className="mt-3 flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 shadow-sm">
          <Search className="h-4 w-4 text-slate-400" />
          <input className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none focus:shadow-none" placeholder="Search chats" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {filters.map((item) => (
            <button
              key={item}
              type="button"
              className={cx(
                "inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-1.5 text-[11px] font-bold shadow-sm transition",
                filter === item ? "border-blue-600 bg-blue-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
              )}
              onClick={() => setFilter(item)}
            >
              <span>{item === "ALL" ? "All" : item.replace("_", " ")}</span>
              <span className={cx("rounded-full px-1.5 py-0.5 text-[10px]", filter === item ? "bg-white/15 text-white" : "bg-white text-slate-500")}>{filterCounts[item]}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="support-queue-list app-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto bg-slate-50 p-2">
        {filteredSessions.length ? filteredSessions.map((session) => (
          <button
            key={session.id}
            onClick={() => onSelect?.(session)}
            className={cx(
              "support-queue-item relative w-full overflow-hidden rounded-lg border bg-white p-2.5 text-left transition hover:border-blue-200 hover:shadow-sm",
              activeId === session.id ? "border-blue-300 shadow-sm ring-2 ring-blue-100" : "border-slate-300"
            )}
          >
            {activeId === session.id ? <span className="absolute inset-y-2.5 left-0 w-1 rounded-r-full bg-blue-700" /> : null}
            <div className="flex items-start gap-2.5">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-blue-600 text-xs font-bold text-white">
                {chatTitle(session, viewMode, t("chat.customerFallback")).slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-semibold text-slate-950">{chatTitle(session, viewMode, t("chat.customerFallback"))}</p>
                  <Badge className="shrink-0" tone={statusTone[session.status] || "slate"}>{session.status === "ASSIGNED" ? "CONNECTED" : session.status}</Badge>
                </div>
                <p className="mt-1 line-clamp-1 text-xs leading-5 text-slate-600">{session.lastMessage || t("chat.noMessages")}</p>
                <p className="mt-0.5 flex min-w-0 items-center gap-1 truncate text-xs font-semibold text-slate-500">
                  <UserRound className="h-3.5 w-3.5 shrink-0" />
                  {viewMode === "customer" ? agentName(session, "Waiting for agent") : `Agent: ${agentName(session, "Unassigned")}`}
                </p>
              </div>
            </div>
            <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2 text-[11px] font-medium text-slate-500">
              <span className="inline-flex min-w-0 items-center gap-1"><Timer className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{formatDate(session.updatedAt || session.createdAt)}</span></span>
              <span className="max-w-full truncate rounded-full bg-slate-100 px-2 py-0.5 text-slate-500">{session.category || session.channel || t("chat.websiteChannel")}</span>
              {session.queuePosition ? <span>{t("chat.queuePosition", { position: session.queuePosition })}</span> : null}
            </div>
          </button>
        )) : <div className="rounded-lg border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">{sessions.length ? "No chats match this filter." : t("chat.noLiveChats")}</div>}
      </div>
    </aside>
  );
}
