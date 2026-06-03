import { ArrowUpRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import Card from "./Card.jsx";

export default function StatCard({ title, value, icon: Icon, trend = "+8%", tone = "sky" }) {
  const { t } = useTranslation();
  const colors = {
    sky: "bg-blue-50 text-blue-700 ring-blue-100",
    emerald: "bg-green-50 text-green-700 ring-green-100",
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    rose: "bg-red-50 text-red-700 ring-red-100",
    violet: "bg-indigo-50 text-indigo-700 ring-indigo-100",
  };

  return (
    <Card className="relative min-h-36 overflow-hidden p-5 transition duration-200 hover:border-slate-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
        </div>
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-md ring-1 ${colors[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-5 inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200">
        <ArrowUpRight className="h-3.5 w-3.5" />
        {t("common.trendThisMonth", { trend })}
      </div>
    </Card>
  );
}
