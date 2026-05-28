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
    <form onSubmit={submit} className="flex shrink-0 items-end gap-3 border-t border-slate-200 bg-white p-4">
      <label className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-md border border-slate-200 text-slate-500 hover:border-teal-200 hover:bg-teal-50 hover:text-teal-700">
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
        className="min-h-10 min-w-0 flex-1 resize-none rounded-md border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
        placeholder={t("chat.writeMessage")}
      />
      {file ? <span className="max-w-32 truncate text-xs font-semibold text-slate-500">{file.name}</span> : null}
      <Button className="h-10 w-10 shrink-0 p-0" aria-label="Send message">
        <Send className="h-4 w-4" />
      </Button>
    </form>
  );
}
