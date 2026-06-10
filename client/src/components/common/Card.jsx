import { cx } from "../../utils/helpers.js";

export default function Card({ children, className, ...props }) {
  return (
    <div className={cx("rounded-2xl border border-slate-300 bg-white shadow-[0_14px_34px_rgba(15,23,42,0.07)] ring-1 ring-slate-900/[0.03]", className)} {...props}>
      {children}
    </div>
  );
}
