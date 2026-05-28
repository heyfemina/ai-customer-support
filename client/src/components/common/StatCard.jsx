import { ArrowUpRight } from "lucide-react";
import Card from "./Card.jsx";

export default function StatCard({ title, value, icon: Icon, trend = "+8%", tone = "sky" }) {
  const colors = {
    sky: "bg-cyan-50 text-cyan-700 ring-cyan-100",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    rose: "bg-rose-50 text-rose-700 ring-rose-100",
    violet: "bg-indigo-50 text-indigo-700 ring-indigo-100",
  };

  return (
    <Card className="relative overflow-hidden p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_20px_44px_rgba(15,23,42,0.08)]">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-500 via-cyan-400 to-emerald-400" />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-xs font-bold uppercase text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
        </div>
        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-md ring-1 shadow-sm ${colors[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-5 inline-flex items-center gap-1 rounded-md bg-teal-50 px-2 py-1 text-xs font-bold text-teal-700 ring-1 ring-teal-100">
        <ArrowUpRight className="h-3.5 w-3.5" />
        {trend} this month
      </div>
    </Card>
  );
}
