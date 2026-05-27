import { cx } from "../../utils/helpers.js";

export default function Card({ children, className }) {
  return (
    <div className={cx("rounded-lg border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]", className)}>
      {children}
    </div>
  );
}
