import { Loader2 } from "lucide-react";
import { cx } from "../../utils/helpers.js";

const variants = {
  primary: "border border-blue-900 bg-blue-900 text-white shadow-sm hover:bg-blue-800 focus:ring-blue-100",
  secondary: "border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-blue-200 hover:bg-blue-50 hover:text-blue-900 focus:ring-blue-100",
  danger: "border border-red-600 bg-red-600 text-white shadow-sm hover:bg-red-700 focus:ring-red-100",
  ghost: "border border-transparent bg-transparent text-slate-600 hover:bg-slate-100 hover:text-blue-900 focus:ring-slate-100",
};

export default function Button({ children, className, variant = "primary", loading = false, icon: Icon, ...props }) {
  return (
    <button
      className={cx(
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition duration-150 focus:outline-none focus:ring-4 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60",
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
