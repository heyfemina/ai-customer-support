import { ArrowUpRight } from "lucide-react";
import Card from "./Card.jsx";

export default function StatCard({ title, value, icon: Icon, trend = "+8%", tone = "sky" }) {
  const colors = {
    sky: "bg-sky-50 text-sky-700 ring-sky-100",
    emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    rose: "bg-rose-50 text-rose-700 ring-rose-100",
    violet: "bg-violet-50 text-violet-700 ring-violet-100",
  };

  return (
    <Card className="relative overflow-hidden p-5 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_22px_50px_rgba(15,23,42,0.10)]">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-sky-500 via-emerald-400 to-amber-400" />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-xs font-bold uppercase text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-950">{value}</p>
        </div>
        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-md ring-1 shadow-sm ${colors[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-5 inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">
        <ArrowUpRight className="h-3.5 w-3.5" />
        {trend} this month
      </div>
    </Card>
  );
}
