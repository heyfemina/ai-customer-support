import { Bot } from "lucide-react";
import { Outlet } from "react-router-dom";

export default function AuthLayout() {
  return (
    <div className="grid min-h-screen bg-slate-50 lg:grid-cols-[1fr_480px]">
      <section className="hidden bg-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-md bg-sky-500">
            <Bot className="h-6 w-6" />
          </div>
          <span className="text-lg font-bold">AI Customer Support System</span>
        </div>
        <div className="max-w-xl">
          <p className="text-4xl font-bold leading-tight">One support command center for admins, agents, and customers.</p>
          <p className="mt-5 text-base text-slate-300">Secure ticketing, live chat, AI handoff workflows, analytics, and multilingual customer care in one SaaS interface.</p>
        </div>
      </section>
      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Outlet />
        </div>
      </section>
    </div>
  );
}
