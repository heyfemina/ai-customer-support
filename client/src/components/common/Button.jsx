import { Loader2 } from "lucide-react";
import { cx } from "../../utils/helpers.js";

const variants = {
  primary: "bg-sky-600 text-white hover:bg-sky-700 focus:ring-sky-200",
  secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 focus:ring-slate-200",
  danger: "bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-200",
  ghost: "bg-transparent text-slate-600 hover:bg-slate-100 focus:ring-slate-200",
};

export default function Button({ children, className, variant = "primary", loading = false, icon: Icon, ...props }) {
  return (
    <button
      className={cx(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60",
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
