import {
  Activity,
  BarChart3,
  Bot,
  Building2,
  Headphones,
  Home,
  Lock,
  MessageSquare,
  Plug,
  Shield,
  Ticket,
  Users,
  X,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../context/AuthContext.jsx";
import { cx } from "../../utils/helpers.js";

const nav = {
  ADMIN: [
    { to: "/admin/dashboard", labelKey: "nav.dashboard", icon: Home },
    { to: "/admin/users", labelKey: "nav.users", icon: Users },
    { to: "/admin/agents", labelKey: "nav.agents", icon: Headphones },
    { to: "/admin/customers", labelKey: "nav.customers", icon: Building2 },
    { to: "/admin/tickets", labelKey: "nav.tickets", icon: Ticket },
    { to: "/admin/chats", labelKey: "nav.chats", icon: MessageSquare },
    { to: "/admin/analytics", labelKey: "nav.analytics", icon: BarChart3 },
    { to: "/admin/ai-settings", labelKey: "nav.aiSettings", icon: Bot },
    { to: "/admin/security", labelKey: "nav.security", icon: Shield },
    { to: "/admin/activity-logs", labelKey: "nav.activityLogs", icon: Activity },
    { to: "/admin/integrations", labelKey: "nav.integrations", icon: Plug },
  ],
  AGENT: [
    { to: "/agent/dashboard", labelKey: "nav.dashboard", icon: Home },
    { to: "/agent/tickets", labelKey: "nav.assignedTickets", icon: Ticket },
    { to: "/agent/live-chats", labelKey: "nav.liveChatQueue", icon: MessageSquare },
    { to: "/agent/performance", labelKey: "nav.performance", icon: BarChart3 },
  ],
  CUSTOMER: [
    { to: "/customer/dashboard", labelKey: "nav.dashboard", icon: Home },
    { to: "/customer/tickets", labelKey: "nav.myTickets", icon: Ticket },
    { to: "/customer/live-chat", labelKey: "nav.liveChat", icon: MessageSquare },
    { to: "/customer/profile", labelKey: "nav.profile", icon: Lock },
  ],
};

export default function Sidebar({ open, onClose }) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const items = nav[user?.role] || [];

  return (
    <>
      <div className={cx("fixed inset-0 z-30 bg-slate-900/30 backdrop-blur-sm lg:hidden", open ? "block" : "hidden")} onClick={onClose} />
      <aside
        className={cx(
          "fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-200/80 bg-white/92 text-slate-900 shadow-xl shadow-slate-200/70 backdrop-blur-xl transition-transform lg:static lg:translate-x-0 lg:shadow-none",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200/80 px-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-teal-600 text-white shadow-[0_12px_26px_rgba(13,148,136,0.22)]">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-950">{t("appShortName")}</p>
              <p className="text-xs font-semibold uppercase text-slate-500">{user?.role || t("workspace")}</p>
            </div>
          </div>
          <button className="rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-950 lg:hidden" onClick={onClose}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="px-5 pb-2 pt-4">
          <p className="text-xs font-bold uppercase text-slate-400">{t("workspace")}</p>
        </div>
        <nav className="app-scrollbar flex-1 space-y-1 overflow-y-auto px-3 pb-3">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                cx(
                  "group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition before:absolute before:left-0 before:h-6 before:w-1 before:rounded-r-full",
                  isActive ? "bg-teal-50 text-teal-900 shadow-sm ring-1 ring-teal-100 before:bg-teal-500" : "text-slate-600 before:bg-transparent hover:bg-slate-50 hover:text-slate-950"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cx(
                      "grid h-8 w-8 place-items-center rounded-md transition",
                      isActive ? "bg-teal-600 text-white shadow-sm" : "bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-teal-700"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                  </span>
                  <span className={cx("truncate", isActive ? "text-teal-950" : "text-slate-600 group-hover:text-slate-950")}>
                    {t(item.labelKey)}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-slate-200/80 p-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3">
            <p className="truncate text-sm font-semibold text-slate-950">{user?.name || t("workspace")}</p>
            <p className="mt-1 truncate text-xs text-slate-500">{user?.email || user?.role}</p>
          </div>
        </div>
      </aside>
    </>
  );
}
