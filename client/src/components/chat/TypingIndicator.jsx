export default function TypingIndicator({ name = "Agent" }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-500">
      <span>{name} is typing</span>
      <span className="flex gap-1">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:120ms]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:240ms]" />
      </span>
    </div>
  );
}
