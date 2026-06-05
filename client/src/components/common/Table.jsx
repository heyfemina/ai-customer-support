import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { cx } from "../../utils/helpers.js";
import Pagination from "./Pagination.jsx";

const alignClasses = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
};

export default function Table({ columns, data, empty, className, paginated = true, initialPageSize = 10, pageSizeOptions = [10, 15, 25, 50], itemLabel = "records" }) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const rows = Array.isArray(data) ? data : [];
  const shouldPaginate = paginated && rows.length > initialPageSize;
  const visibleRows = useMemo(() => {
    if (!shouldPaginate) return rows;
    return rows.slice((page - 1) * pageSize, page * pageSize);
  }, [page, pageSize, rows, shouldPaginate]);

  useEffect(() => {
    setPage(1);
  }, [rows.length, pageSize]);

  return (
    <div className={className}>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-200/60 ring-1 ring-slate-900/[0.02]">
        <div className="app-scrollbar overflow-x-auto">
          <table className="w-full min-w-max border-separate border-spacing-0">
            <thead className="bg-slate-50">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={cx(
                      "h-11 whitespace-nowrap border-b border-slate-200 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 first:pl-5 last:pr-5",
                      alignClasses[column.align || "left"],
                      column.headerClassName
                    )}
                  >
                    {column.labelKey ? t(column.labelKey) : column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.length ? (
                visibleRows.map((row, index) => (
                  <tr key={row.id || index} className="group border-b border-slate-100 transition hover:bg-slate-50/70">
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={cx(
                          "h-[52px] border-b border-slate-100 px-4 py-3 align-middle text-sm leading-5 text-slate-700 first:pl-5 last:pr-5 group-last:border-b-0",
                          column.nowrap === false ? "whitespace-normal" : "whitespace-nowrap",
                          alignClasses[column.align || "left"],
                          column.className
                        )}
                      >
                        {column.render ? column.render(row) : row[column.key]}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="px-5 py-12 text-center">
                    <div className="mx-auto max-w-sm rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm font-semibold text-slate-500">
                      {empty || t("table.noRecords")}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {shouldPaginate ? (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={rows.length}
          itemLabel={itemLabel}
          pageSizeOptions={pageSizeOptions}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      ) : null}
    </div>
  );
}
