import { cx } from "../../utils/helpers.js";

export default function Card({ children, className }) {
  return (
    <div className={cx("rounded-lg border border-white/70 bg-white/95 shadow-[0_18px_45px_rgba(15,23,42,0.07),0_1px_0_rgba(255,255,255,0.9)_inset] ring-1 ring-slate-900/[0.03] backdrop-blur", className)}>
      {children}
    </div>
  );
}
