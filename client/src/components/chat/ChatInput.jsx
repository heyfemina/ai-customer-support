import { Paperclip, Send } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import Button from "../common/Button.jsx";

export default function ChatInput({ onSend, onTyping, onStopTyping }) {
  const { t } = useTranslation();
  const [content, setContent] = useState("");
  const [file, setFile] = useState(null);

  const submit = (event) => {
    event.preventDefault();
    if (!content.trim() && !file) return;
    onSend?.({ content: content.trim(), file });
    setContent("");
    setFile(null);
    onStopTyping?.();
  };

  return (
    <form onSubmit={submit} className="support-composer flex shrink-0 items-center gap-2 border-t border-slate-200 bg-white p-3">
      <label className="support-composer-tool grid h-11 w-11 shrink-0 cursor-pointer place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700" title={file?.name || "Attach file"}>
        <Paperclip className="h-4 w-4" />
        <input type="file" accept="image/*,.pdf,.doc,.docx,.txt" className="hidden" onChange={(event) => setFile(event.target.files?.[0] || null)} />
      </label>
      <div className="min-w-0 flex-1">
        <textarea
          value={content}
          onBlur={() => onStopTyping?.()}
          onChange={(event) => {
            setContent(event.target.value);
            onTyping?.();
          }}
          rows={1}
          className="support-composer-input h-11 min-h-11 max-h-28 w-full resize-none overflow-y-auto rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm leading-5 text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          placeholder={file ? `Attached: ${file.name}` : t("chat.writeMessage")}
        />
      </div>
      <Button type="submit" className="h-11 w-12 shrink-0 rounded-xl p-0" aria-label="Send message" disabled={!content.trim() && !file}>
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}
