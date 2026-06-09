import { Paperclip, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Button from "../common/Button.jsx";

export default function ChatInput({ onSend, onTyping, onStopTyping }) {
  const { t } = useTranslation();
  const [content, setContent] = useState("");
  const [file, setFile] = useState(null);
  const typingRef = useRef(false);
  const stopTimerRef = useRef(null);

  useEffect(() => () => {
    if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current);
  }, []);

  const notifyTyping = () => {
    if (!typingRef.current) {
      typingRef.current = true;
      onTyping?.();
    }
    if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current);
    stopTimerRef.current = window.setTimeout(() => {
      typingRef.current = false;
      onStopTyping?.();
    }, 1200);
  };

  const stopTyping = () => {
    if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current);
    stopTimerRef.current = null;
    if (typingRef.current) {
      typingRef.current = false;
      onStopTyping?.();
    }
  };

  const submit = (event) => {
    event.preventDefault();
    if (!content.trim() && !file) return;
    onSend?.({ content: content.trim(), file });
    setContent("");
    setFile(null);
    stopTyping();
  };

  return (
    <form onSubmit={submit} className="support-composer flex shrink-0 items-end gap-2 border-t border-slate-200 bg-white p-3">
      <label className="support-composer-tool grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700" title={file?.name || t("chat.attachFile", { defaultValue: "Attach file" })}>
        <Paperclip className="h-4 w-4" />
        <input type="file" accept="image/*,.pdf,.doc,.docx,.txt" className="hidden" onChange={(event) => setFile(event.target.files?.[0] || null)} />
      </label>
      <div className="min-w-0 flex-1">
        <textarea
          value={content}
          onBlur={stopTyping}
          onChange={(event) => {
            setContent(event.target.value);
            notifyTyping();
          }}
          rows={1}
          className="support-composer-input h-10 min-h-10 max-h-28 w-full resize-none overflow-y-auto rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm leading-5 text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          placeholder={file ? `Attached: ${file.name}` : t("chat.writeMessage")}
        />
      </div>
      <Button type="submit" className="h-10 w-11 shrink-0 rounded-lg p-0" aria-label={t("chat.sendMessage", { defaultValue: "Send message" })} disabled={!content.trim() && !file}>
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}
