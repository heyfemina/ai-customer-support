import { useState } from "react";
import { Download, ExternalLink, FileText, Image as ImageIcon, X } from "lucide-react";
import { resolveFileUrl } from "../../utils/helpers.js";

function isImage(file) {
  return file?.mimeType?.startsWith("image/") || ["jpg", "jpeg", "png", "webp"].includes(String(file?.fileType || "").toLowerCase());
}

function formatBytes(value) {
  if (!value && value !== 0) return "";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AttachmentPreview({ attachments = [] }) {
  const [preview, setPreview] = useState(null);
  const [brokenImages, setBrokenImages] = useState(() => new Set());

  if (!attachments.length) return <p className="text-sm text-slate-500">No attachments uploaded.</p>;

  return (
    <>
      <div className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {attachments.map((file) => {
          const url = resolveFileUrl(file.fileUrl);
          const name = file.originalName || file.fileName || "Attachment";
          const image = isImage(file) && !brokenImages.has(url);
          const content = (
            <>
              {image ? (
                <div className="flex h-40 items-center justify-center bg-slate-100 p-2">
                  <img
                    src={url}
                    alt={name}
                    className="max-h-full max-w-full rounded object-contain"
                    loading="lazy"
                    onError={() => setBrokenImages((current) => new Set(current).add(url))}
                  />
                </div>
              ) : (
                <div className="flex h-32 flex-col items-center justify-center gap-2 bg-slate-50 px-4 text-center text-slate-500">
                  <FileText className="h-10 w-10 text-slate-400" />
                  <span className="text-xs font-semibold">Attachment available</span>
                </div>
              )}
              <div className="flex items-start gap-3 p-3">
                {image ? <ImageIcon className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" /> : <Download className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />}
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate font-semibold text-slate-800 group-hover:text-blue-800">{name}</p>
                  <p className="mt-1 text-xs text-slate-500">{file.mimeType || file.fileType || "file"} {formatBytes(file.fileSize)}</p>
                  <span className="mt-2 inline-flex items-center gap-2 text-xs font-bold text-blue-700">
                    <ExternalLink className="h-3.5 w-3.5" /> {image ? "Click to preview" : "Open file"}
                  </span>
                </div>
              </div>
            </>
          );

          return image ? (
            <button
              key={file.id || file.fileUrl}
              type="button"
              onClick={() => setPreview({ url, name })}
              className="group min-w-0 overflow-hidden rounded-md border border-slate-200 bg-white text-sm shadow-sm transition hover:border-blue-200 hover:bg-blue-50 focus:outline-none focus:ring-4 focus:ring-blue-100"
            >
              {content}
            </button>
          ) : (
            <a key={file.id || file.fileUrl} href={url} target="_blank" rel="noreferrer" download={name} className="group min-w-0 overflow-hidden rounded-md border border-slate-200 bg-white text-sm shadow-sm transition hover:border-blue-200 hover:bg-blue-50">
              {content}
            </a>
          );
        })}
      </div>
      {preview ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 p-4" role="dialog" aria-modal="true" aria-label={preview.name}>
          <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
              <p className="min-w-0 truncate text-sm font-semibold text-slate-900">{preview.name}</p>
              <div className="flex items-center gap-2">
                <a href={preview.url} target="_blank" rel="noreferrer" className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50" aria-label="Open image in new tab">
                  <ExternalLink className="h-4 w-4" />
                </a>
                <a href={preview.url} download={preview.name} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50" aria-label="Download image">
                  <Download className="h-4 w-4" />
                </a>
                <button type="button" onClick={() => setPreview(null)} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50" aria-label="Close preview">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex max-h-[calc(92vh-4rem)] items-center justify-center bg-slate-950 p-3">
              <img src={preview.url} alt={preview.name} className="max-h-[calc(92vh-5.5rem)] max-w-full object-contain" />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
