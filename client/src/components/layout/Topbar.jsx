import { Bell, LogOut, Menu, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Button from "../common/Button.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { useLanguage } from "../../context/LanguageContext.jsx";
import { useSocket } from "../../context/SocketContext.jsx";
import { initials } from "../../utils/helpers.js";

export default function Topbar({ onMenu }) {
  const { user, logout } = useAuth();
  const { language, changeLanguage } = useLanguage();
  const { t } = useTranslation();
  const { notifications, clearNotifications } = useSocket();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:px-6">
      <div className="flex items-center gap-3">
        <button className="rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={onMenu}>
          <Menu className="h-5 w-5" />
        </button>
        <div className="hidden h-10 w-80 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 md:flex">
          <Search className="h-4 w-4 text-slate-400" />
          <input className="w-full bg-transparent text-sm outline-none" placeholder={t("searchPlaceholder")} />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <select
          value={language}
          onChange={(event) => changeLanguage(event.target.value)}
          className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700"
        >
          <option value="en">EN - English</option>
          <option value="it">IT - Italian</option>
          <option value="es">ES - Spanish</option>
          <option value="fr">FR - French</option>
        </select>
        <button className="relative grid h-10 w-10 place-items-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50" title={notifications[0]?.message || t("chat.notifications")} onClick={clearNotifications}>
          <Bell className="h-4 w-4" />
          {notifications.length ? <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500" /> : null}
        </button>
        <div className="hidden items-center gap-3 sm:flex">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-slate-900 text-sm font-bold text-white">{initials(user?.name)}</div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-slate-950">{user?.name}</p>
            <p className="text-xs text-slate-500">{user?.email}</p>
          </div>
        </div>
        <Button variant="ghost" className="h-10 w-10 p-0" onClick={handleLogout} aria-label="Logout">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
