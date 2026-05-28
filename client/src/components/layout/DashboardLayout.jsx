import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar.jsx";
import Topbar from "./Topbar.jsx";

export default function DashboardLayout() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(45,212,191,0.12),transparent_30rem),radial-gradient(circle_at_top_right,rgba(125,211,252,0.14),transparent_28rem),linear-gradient(180deg,#fbfdff_0%,#f6f8fb_46%,#eef4f8_100%)] text-slate-900">
      <div className="flex min-h-screen">
        <Sidebar open={open} onClose={() => setOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onMenu={() => setOpen(true)} />
          <main className="flex-1 px-4 py-5 sm:px-5 lg:px-8 lg:py-7">
            <div className="mx-auto w-full max-w-[1480px]">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
      {/* AI bot popup is disabled for now to avoid OpenAI API usage. */}
    </div>
  );
}
