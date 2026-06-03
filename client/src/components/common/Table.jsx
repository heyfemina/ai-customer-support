import { useTranslation } from "react-i18next";
import { cx } from "../../utils/helpers.js";

export default function Table({ columns, data, empty, className }) {
  const { t } = useTranslation();
  return (
    <div className={cx("overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm shadow-slate-200/60 ring-1 ring-slate-900/[0.02]", className)}>
      <div className="app-scrollbar overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="whitespace-nowrap border-b border-slate-200 px-5 py-3.5 text-left text-[11px] font-extrabold uppercase tracking-[0.08em] text-slate-500 first:pl-6 last:pr-6">
                  {column.labelKey ? t(column.labelKey) : column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length ? (
              data.map((row, index) => (
                <tr key={row.id || index} className="group transition hover:bg-blue-50/35">
                  {columns.map((column) => (
                    <td key={column.key} className="max-w-80 whitespace-nowrap border-b border-slate-100 px-5 py-4 align-middle text-sm text-slate-700 first:pl-6 last:pr-6 group-last:border-b-0">
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
  );
}
