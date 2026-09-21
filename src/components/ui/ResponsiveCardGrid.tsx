import React from "react";

export interface MetricCardItem {
  id: string;
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  accentColor?: string;
  badge?: React.ReactNode;
}

interface ResponsiveCardGridProps {
  items: MetricCardItem[];
  columns?: string;
}

export function ResponsiveCardGrid({ items, columns = "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6" }: ResponsiveCardGridProps) {
  return (
    <div className={`grid gap-3.5 ${columns} w-full max-w-full min-w-0`}>
      {items.map((item) => (
        <div
          key={item.id}
          className="w-full max-w-full min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between gap-2 text-xs text-slate-500 mb-1.5 min-w-0">
              <span className="flex items-center gap-1.5 font-semibold text-slate-700 truncate" title={item.label}>
                {item.icon && <span className="shrink-0">{item.icon}</span>}
                <span className="truncate">{item.label}</span>
              </span>
              {item.badge && <span className="shrink-0">{item.badge}</span>}
            </div>

            <div className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 tabular-nums truncate">
              {item.value}
            </div>
          </div>

          {item.subtext && (
            <div className="text-[11px] text-slate-500 font-medium mt-2 pt-2 border-t border-slate-100 truncate" title={item.subtext}>
              {item.subtext}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
