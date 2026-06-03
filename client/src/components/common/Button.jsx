import { Loader2 } from "lucide-react";
import { cx } from "../../utils/helpers.js";

const variants = {
  primary: "border border-blue-600 bg-blue-600 text-white shadow-sm hover:border-blue-700 hover:bg-blue-700 focus:ring-blue-100",
  secondary: "border border-slate-300 bg-white text-slate-800 shadow-sm hover:border-slate-400 hover:bg-slate-50 hover:text-slate-950 focus:ring-slate-100",
  outline: "border border-blue-300 bg-white text-blue-800 shadow-sm hover:border-blue-400 hover:bg-blue-50 focus:ring-blue-100",
  danger: "border border-red-600 bg-red-600 text-white shadow-sm hover:border-red-700 hover:bg-red-700 focus:ring-red-100",
  success: "border border-green-600 bg-green-600 text-white shadow-sm hover:border-green-700 hover:bg-green-700 focus:ring-green-100",
  ghost: "border border-slate-200 bg-slate-50 text-slate-700 shadow-sm hover:border-slate-300 hover:bg-white hover:text-slate-950 focus:ring-slate-100",
};

const sizes = {
  sm: "min-h-9 px-3 py-1.5 text-xs",
  md: "min-h-10 px-4 py-2 text-sm",
  lg: "min-h-11 px-5 py-2.5 text-sm",
};

export default function Button({ children, className, variant = "primary", size = "md", loading = false, icon: Icon, ...props }) {
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-md font-semibold leading-none transition duration-150 focus:outline-none focus:ring-4 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none",
        variants[variant],
        sizes[size],
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
