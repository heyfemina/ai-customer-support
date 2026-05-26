import { Loader2 } from "lucide-react";

export default function Loader({ label = "Loading" }) {
  return (
    <div className="grid min-h-56 place-items-center text-slate-500">
      <div className="flex items-center gap-3 text-sm font-medium">
        <Loader2 className="h-5 w-5 animate-spin text-sky-600" />
        {label}
      </div>
    </div>
  );
}
