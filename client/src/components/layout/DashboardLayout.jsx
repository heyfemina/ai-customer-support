import { useState } from "react";
import { Outlet } from "react-router-dom";
import AiChatBubble from "../chat/AiChatBubble.jsx";
import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";
import { useAuth } from "../../context/AuthContext.jsx";

export default function DashboardLayout() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <Sidebar open={open} onClose={() => setOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onMenu={() => setOpen(true)} />
          <main className="flex-1 px-4 py-5 sm:px-6 lg:px-7 lg:py-6">
            <div className="mx-auto w-full max-w-[1540px]">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
      {user?.role === "CUSTOMER" ? <AiChatBubble /> : null}
    </div>
  );
}
