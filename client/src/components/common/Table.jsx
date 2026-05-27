import { useTranslation } from "react-i18next";

export default function Table({ columns, data, empty }) {
  const { t } = useTranslation();
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200/80">
          <thead className="bg-slate-50/90">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                  {column.labelKey ? t(column.labelKey) : column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.length ? (
              data.map((row, index) => (
                <tr key={row.id || index} className="transition hover:bg-slate-50/90">
                  {columns.map((column) => (
                    <td key={column.key} className="whitespace-nowrap px-4 py-3.5 text-sm text-slate-700">
                      {column.render ? column.render(row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-slate-500">
                  {empty || t("table.noRecords")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
