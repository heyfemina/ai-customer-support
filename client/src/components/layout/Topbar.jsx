import { useEffect, useRef, useState } from "react";
import { Bell, ChevronDown, LogOut, Menu, Plus, Search, UserCircle } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Button from "../common/Button.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { languageOptions, useLanguage } from "../../context/LanguageContext.jsx";
import { useSocket } from "../../context/SocketContext.jsx";
import { initials } from "../../utils/helpers.js";

export default function Topbar({ onMenu }) {
  const { user, logout } = useAuth();
  const { language, changeLanguage } = useLanguage();
  const { t } = useTranslation();
  const { notifications, clearNotifications } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const [profileOpen, setProfileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const profileRef = useRef(null);

  useEffect(() => {
    const closeProfile = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) setProfileOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setProfileOpen(false);
    };

    document.addEventListener("mousedown", closeProfile);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeProfile);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const handleLogout = () => {
    setProfileOpen(false);
    logout();
    navigate("/login");
  };

  const userRole = String(user?.role || "").toUpperCase();
  const quickActionPath = userRole === "CUSTOMER" ? "/customer/tickets/create" : userRole === "AGENT" ? "/agent/live-chats" : "/admin/tickets";
  const quickActionLabel = userRole === "CUSTOMER" ? t("common.quickNewTicket") : userRole === "AGENT" ? t("common.quickOpenQueue") : t("common.quickReviewTickets");
  const profilePath = userRole === "CUSTOMER" ? "/customer/settings" : userRole === "AGENT" ? "/agent/settings" : "/admin/settings";
  const ticketSearchPath = userRole === "CUSTOMER" ? "/customer/tickets" : userRole === "AGENT" ? "/agent/tickets" : "/admin/tickets";

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setSearch(params.get("search") || "");
  }, [location.search]);

  const submitSearch = (event) => {
    event.preventDefault();
    const query = search.trim();
    navigate(query ? `${ticketSearchPath}?search=${encodeURIComponent(query)}` : ticketSearchPath);
  };

  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between gap-3 border-b border-slate-200 px-4 shadow-sm backdrop-blur-xl lg:px-6" style={{ background: "var(--topbar-bg)" }}>
      <div className="flex min-w-0 items-center gap-3">
        <button className="rounded-md border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 lg:hidden" onClick={onMenu}>
          <Menu className="h-5 w-5" />
        </button>
        <form onSubmit={submitSearch} className="hidden h-10 w-[min(22rem,32vw)] items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 shadow-sm transition focus-within:border-blue-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-100 md:flex">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            className="w-full border-0 bg-transparent text-sm outline-none focus:shadow-none"
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label={t("searchPlaceholder")}
          />
        </form>
      </div>
      <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
        <Button className="hidden h-10 md:inline-flex" icon={Plus} onClick={() => navigate(quickActionPath)}>
          <span className="hidden lg:inline">{quickActionLabel}</span>
        </Button>
        <select
          value={language}
          onChange={(event) => changeLanguage(event.target.value)}
          className="hidden h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 xl:block"
          aria-label={t("common.selectLanguage")}
        >
          {languageOptions.map((option) => <option key={option.code} value={option.code}>{option.label}</option>)}
        </select>
        <button className="relative grid h-10 w-10 place-items-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800" title={notifications[0]?.message || t("chat.notifications")} onClick={clearNotifications}>
          <Bell className="h-4 w-4" />
          {notifications.length ? <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-red-500" /> : null}
        </button>
        <div className="relative shrink-0" ref={profileRef}>
          <button
            type="button"
            className="flex h-10 max-w-[210px] items-center gap-2 rounded-md border border-slate-200 bg-white py-1 pl-1 pr-2 text-left shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus:ring-4 focus:ring-blue-100 sm:max-w-[260px]"
            onClick={() => setProfileOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={profileOpen}
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-blue-600 text-xs font-bold text-white shadow-sm">{initials(user?.name)}</span>
            <span className="hidden min-w-0 leading-tight sm:block">
              <span className="block max-w-32 truncate text-sm font-semibold text-slate-950 xl:max-w-40">{user?.name || t("common.user")}</span>
              <span className="block text-xs font-medium uppercase text-slate-500">{userRole || t("common.user")}</span>
            </span>
            <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${profileOpen ? "rotate-180" : ""}`} />
          </button>
          {profileOpen ? (
            <div className="absolute right-0 z-50 mt-2 w-[min(18rem,calc(100vw-1rem))] overflow-hidden rounded-xl border border-slate-200 bg-white py-2 shadow-xl shadow-slate-900/12 ring-1 ring-slate-900/[0.03]" role="menu">
              <div className="border-b border-slate-100 px-4 pb-3 pt-2">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-600 text-sm font-bold text-white shadow-sm">{initials(user?.name)}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950">{user?.name || t("common.user")}</p>
                    <p className="truncate text-xs text-slate-500">{user?.email || userRole || t("common.signedIn")}</p>
                    <p className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">{userRole || t("common.user")}</p>
                  </div>
                </div>
                <label className="mt-3 block">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">{t("language")}</span>
                  <select
                    value={language}
                    onChange={(event) => changeLanguage(event.target.value)}
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  >
                    {languageOptions.map((option) => <option key={option.code} value={option.code}>{option.label}</option>)}
                  </select>
                </label>
              </div>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
                onClick={() => {
                  setProfileOpen(false);
                  navigate(profilePath);
                }}
                role="menuitem"
              >
                <UserCircle className="h-4 w-4 text-slate-400" />
                {t("common.profile")}
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50 hover:text-red-700"
                onClick={handleLogout}
                role="menuitem"
              >
                <LogOut className="h-4 w-4" />
                {t("logout")}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
