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
    <div className="min-h-screen bg-[linear-gradient(180deg,#fbfdff_0%,#f6f8fb_42%,#edf3f8_100%)] text-slate-900">
      <div className="flex min-h-screen">
        <Sidebar open={open} onClose={() => setOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onMenu={() => setOpen(true)} />
          <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
            <div className="mx-auto w-full max-w-[1500px]">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
      {user?.role === "CUSTOMER" ? <AiChatBubble /> : null}
    </div>
  );
}
