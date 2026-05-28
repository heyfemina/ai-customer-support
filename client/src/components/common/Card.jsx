import { cx } from "../../utils/helpers.js";

export default function Card({ children, className }) {
  return (
    <div className={cx("rounded-lg border border-slate-200/80 bg-white/94 shadow-[0_16px_38px_rgba(15,23,42,0.06),0_1px_0_rgba(255,255,255,0.9)_inset] ring-1 ring-slate-900/[0.02] backdrop-blur", className)}>
      {children}
    </div>
  );
}
