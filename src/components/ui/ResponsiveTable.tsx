import React from "react";

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render: (item: T) => React.ReactNode;
  className?: string;
  sortableKey?: string;
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  mobileCardRender?: (item: T) => React.ReactNode;
  emptyState?: React.ReactNode;
  onSort?: (key: string) => void;
  activeSortKey?: string;
  sortDirection?: "asc" | "desc";
}

export function ResponsiveTable<T>({
  data,
  columns,
  keyExtractor,
  mobileCardRender,
  emptyState,
  onSort,
  activeSortKey,
  sortDirection,
}: ResponsiveTableProps<T>) {
  if (data.length === 0 && emptyState) {
    return <div className="w-full min-w-0">{emptyState}</div>;
  }

  return (
    <div className="w-full max-w-full min-w-0">
      {/* Vista Móvil (< lg): Cards Apiladas */}
      <div className="block lg:hidden space-y-3 w-full max-w-full min-w-0">
        {data.map((item) => {
          const key = keyExtractor(item);
          if (mobileCardRender) {
            return <div key={key}>{mobileCardRender(item)}</div>;
          }
          return (
            <div
              key={key}
              className="w-full max-w-full min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs space-y-2 text-xs"
            >
              {columns.map((col) => (
                <div key={col.key} className="flex justify-between items-center py-1 border-b border-slate-100 last:border-0 min-w-0">
                  <span className="font-semibold text-slate-500 shrink-0 pr-2">{col.header}</span>
                  <span className="text-slate-900 font-medium truncate">{col.render(item)}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Vista Desktop (>= lg): Tabla Estructurada con Contenedor de Scroll Aislado */}
      <div className="hidden lg:block w-full max-w-full min-w-0 rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse min-w-[700px]">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200/80 select-none">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`px-4 py-3.5 ${col.className ?? ""} ${
                      col.sortableKey ? "cursor-pointer hover:text-slate-900 transition" : ""
                    }`}
                    onClick={() => col.sortableKey && onSort && onSort(col.sortableKey)}
                  >
                    <div className="flex items-center gap-1">
                      <span>{col.header}</span>
                      {col.sortableKey && activeSortKey === col.sortableKey && (
                        <span className="text-emerald-600 font-bold">
                          {sortDirection === "asc" ? "↑" : "↓"}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {data.map((item) => (
                <tr key={keyExtractor(item)} className="hover:bg-slate-50/70 transition-colors">
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3.5 ${col.className ?? ""}`}>
                      {col.render(item)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
