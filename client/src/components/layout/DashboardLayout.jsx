import { useState } from "react";
import { Outlet } from "react-router-dom";
import AiChatBubble from "../chat/AiChatBubble.jsx";
import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

export default function DashboardLayout() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const role = String(user?.role || "").toUpperCase();

  return (
    <div className="min-h-screen overflow-x-hidden text-slate-900" style={{ background: "var(--background)", color: "var(--text-main)" }}>
      <div className="flex min-h-screen">
        <Sidebar open={open} onClose={() => setOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col lg:pl-72">
          <Topbar onMenu={() => setOpen(true)} />
          <main className="min-w-0 flex-1 px-3 py-4 sm:px-5 lg:px-5 lg:py-6">
            <div className="mx-auto w-full max-w-[1360px]">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
      {role === "CUSTOMER" ? <AiChatBubble /> : null}
    </div>
  );
}
