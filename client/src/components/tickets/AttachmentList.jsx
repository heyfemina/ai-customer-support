import { Download, FileText, Image as ImageIcon } from "lucide-react";

const apiOrigin = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "");

function attachmentUrl(file) {
  if (!file?.fileUrl) return "#";
  return file.fileUrl.startsWith("http") ? file.fileUrl : `${apiOrigin}${file.fileUrl}`;
}

function isImage(file) {
  return file?.mimeType?.startsWith("image/") || ["jpg", "jpeg", "png", "webp"].includes(String(file?.fileType || "").toLowerCase());
}

function formatBytes(value) {
  if (!value && value !== 0) return "";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AttachmentList({ attachments = [] }) {
  if (!attachments.length) return <p className="text-sm text-slate-500">No attachments uploaded.</p>;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {attachments.map((file) => {
        const url = attachmentUrl(file);
        const name = file.originalName || file.fileName || "Attachment";
        return (
          <a key={file.id || file.fileUrl} href={url} target="_blank" rel="noreferrer" className="group overflow-hidden rounded-md border border-slate-200 bg-white text-sm shadow-sm transition hover:border-blue-200 hover:bg-blue-50">
            {isImage(file) ? (
              <img src={url} alt={name} className="h-32 w-full bg-slate-100 object-cover" />
            ) : (
              <div className="flex h-32 items-center justify-center bg-slate-50 text-slate-400">
                <FileText className="h-10 w-10" />
              </div>
            )}
            <div className="flex items-start gap-3 p-3">
              {isImage(file) ? <ImageIcon className="mt-0.5 h-4 w-4 text-blue-700" /> : <Download className="mt-0.5 h-4 w-4 text-blue-700" />}
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-800 group-hover:text-blue-800">{name}</p>
                <p className="mt-1 text-xs text-slate-500">{file.mimeType || file.fileType || "file"} {formatBytes(file.fileSize)}</p>
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
}
