import { cx } from "../../utils/helpers.js";

const tones = {
  green: "bg-green-50 text-green-700 ring-green-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  violet: "bg-slate-100 text-slate-700 ring-slate-200",
};

export default function Badge({ children, tone = "slate", className }) {
  return (
    <span className={cx("inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold leading-none ring-1", tones[tone], className)}>
      {children}
    </span>
  );
}
