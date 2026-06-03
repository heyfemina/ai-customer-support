import { Bot } from "lucide-react";
import { Outlet } from "react-router-dom";

export default function AuthLayout() {
  return (
    <div className="grid min-h-screen bg-slate-50 lg:grid-cols-[minmax(0,1fr)_minmax(420px,520px)]">
      <section className="hidden border-r border-slate-200 bg-white p-10 text-slate-950 lg:flex lg:flex-col lg:justify-between xl:p-12">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-md bg-blue-600 text-white shadow-sm">
            <Bot className="h-6 w-6" />
          </div>
          <span className="text-lg font-bold">AI Customer Support System</span>
        </div>
        <div className="max-w-xl">
          <p className="text-4xl font-bold leading-tight tracking-tight">One support command center for admins, agents, and customers.</p>
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-500">Secure ticketing, live chat, AI handoff workflows, analytics, and multilingual customer care in one SaaS interface.</p>
          <div className="mt-8 grid max-w-lg gap-3">
            {["Role-based workspace access", "Secure ticket and attachment handling", "Live chat and reporting workflows"].map((item) => (
              <div key={item} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">{item}</div>
            ))}
          </div>
        </div>
      </section>
      <section className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:min-h-0 lg:p-8">
        <div className="w-full max-w-[420px]">
          <Outlet />
        </div>
      </section>
    </div>
  );
}
