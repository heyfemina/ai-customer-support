import { cx } from "../../utils/helpers.js";

export default function Card({ children, className }) {
  return (
    <div className={cx("rounded-lg border border-slate-200/80 bg-white shadow-[0_14px_34px_rgba(15,23,42,0.055),0_1px_0_rgba(255,255,255,0.9)_inset] ring-1 ring-slate-900/[0.02]", className)}>
      {children}
    </div>
  );
}
