import Button from "./Button.jsx";

export default function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange, pageSizeOptions = [10, 15, 25, 50], itemLabel = "records" }) {
  const safeTotal = Number(total || 0);
  const safePageSize = Number(pageSize || 10);
  const totalPages = Math.max(1, Math.ceil(safeTotal / safePageSize));
  const currentPage = Math.min(Math.max(Number(page || 1), 1), totalPages);
  const start = safeTotal ? (currentPage - 1) * safePageSize + 1 : 0;
  const end = Math.min(currentPage * safePageSize, safeTotal);

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm shadow-slate-200/50 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-semibold text-slate-600">
        Showing <span className="text-slate-950">{start}-{end}</span> of <span className="text-slate-950">{safeTotal}</span> {itemLabel}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {onPageSizeChange ? (
          <select className="app-field h-9 w-24 py-1 text-sm" value={safePageSize} onChange={(event) => onPageSizeChange(Number(event.target.value))}>
            {pageSizeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        ) : null}
        <Button size="sm" variant="secondary" disabled={currentPage <= 1} onClick={() => onPageChange?.(currentPage - 1)}>Previous</Button>
        <span className="inline-flex min-h-9 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-700">
          Page {currentPage} of {totalPages}
        </span>
        <Button size="sm" variant="secondary" disabled={currentPage >= totalPages} onClick={() => onPageChange?.(currentPage + 1)}>Next</Button>
      </div>
    </div>
  );
}
