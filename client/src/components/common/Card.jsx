import { cx } from "../../utils/helpers.js";

export default function Card({ children, className }) {
  return (
    <div className={cx("rounded-lg border border-slate-200 bg-white shadow-sm ring-1 ring-slate-900/[0.015]", className)}>
      {children}
    </div>
  );
}
