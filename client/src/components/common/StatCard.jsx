import { ArrowUpRight } from "lucide-react";
import Card from "./Card.jsx";

export default function StatCard({ title, value, icon: Icon, trend = "+8%", tone = "sky" }) {
  const colors = {
    sky: "bg-sky-50 text-sky-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    rose: "bg-rose-50 text-rose-700",
    violet: "bg-violet-50 text-violet-700",
  };

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
        </div>
        <div className={`grid h-11 w-11 place-items-center rounded-md ${colors[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-emerald-600">
        <ArrowUpRight className="h-3.5 w-3.5" />
        {trend} this month
      </div>
    </Card>
  );
}
