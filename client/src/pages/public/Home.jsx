import { Bot, MessageSquare, ShieldCheck, Ticket } from "lucide-react";
import { Link } from "react-router-dom";
import Button from "../../components/common/Button.jsx";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-md bg-sky-500"><Bot className="h-5 w-5" /></div>
          <span className="font-bold">AI Customer Support System</span>
        </div>
        <Link to="/login"><Button>Open console</Button></Link>
      </header>
      <section className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[1fr_520px] lg:items-center">
        <div>
          <h1 className="text-4xl font-bold leading-tight md:text-6xl">AI Customer Support System</h1>
          <p className="mt-5 max-w-2xl text-lg text-slate-300">A complete SaaS support workspace with role-based dashboards, ticketing, live chat, AI handoff, analytics, security controls, and multilingual customer journeys.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/login"><Button>Sign in</Button></Link>
            <Link to="/register"><Button variant="secondary">Create customer account</Button></Link>
          </div>
        </div>
        <div className="grid gap-4">
          {[
            [Ticket, "Ticket operations", "Track priorities, owners, status, attachments, and replies."],
            [MessageSquare, "Live chat command center", "Queue management, typing state, file sharing, transfer UI, and ratings."],
            [ShieldCheck, "Security and compliance", "RBAC, JWT-ready client, activity logs, GDPR, API security, 2FA placeholders."],
          ].map(([Icon, title, text]) => (
            <div key={title} className="rounded-lg border border-white/10 bg-white/5 p-5">
              <Icon className="h-6 w-6 text-sky-300" />
              <h2 className="mt-3 font-semibold">{title}</h2>
              <p className="mt-1 text-sm text-slate-300">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
