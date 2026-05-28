import { Loader2 } from "lucide-react";
import { cx } from "../../utils/helpers.js";

const variants = {
  primary: "bg-teal-600 text-white shadow-[0_10px_20px_rgba(13,148,136,0.16)] hover:bg-teal-700 focus:ring-teal-200",
  secondary: "border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800 focus:ring-teal-100",
  danger: "bg-rose-600 text-white shadow-[0_10px_20px_rgba(225,29,72,0.16)] hover:bg-rose-700 focus:ring-rose-200",
  ghost: "bg-transparent text-slate-600 hover:bg-teal-50 hover:text-teal-800 focus:ring-teal-100",
};

export default function Button({ children, className, variant = "primary", loading = false, icon: Icon, ...props }) {
  return (
    <button
      className={cx(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-4 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60",
        variants[variant],
        className
      )}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}
