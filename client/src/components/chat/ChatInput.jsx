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
    <form onSubmit={submit} className="support-composer flex shrink-0 items-end gap-2 border-t border-slate-200 bg-white p-3 sm:gap-3 sm:p-4">
      <label className="support-composer-tool grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-md border border-slate-200 text-slate-500 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">
        <Paperclip className="h-4 w-4" />
        <input type="file" accept="image/*,.pdf,.doc,.docx,.txt" className="hidden" onChange={(event) => setFile(event.target.files?.[0] || null)} />
      </label>
      <textarea
        value={content}
        onBlur={() => onStopTyping?.()}
        onChange={(event) => {
          setContent(event.target.value);
          onTyping?.();
        }}
        rows={1}
        className="support-composer-input min-h-10 min-w-0 flex-1 resize-none rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
        placeholder={t("chat.writeMessage")}
      />
      {file ? <span className="hidden max-w-32 truncate text-xs font-semibold text-slate-500 sm:block">{file.name}</span> : null}
      <Button className="h-10 w-10 shrink-0 p-0" aria-label="Send message" disabled={!content.trim() && !file}>
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}
