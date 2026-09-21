import React from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, badge, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full max-w-full min-w-0 pb-1">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2.5 min-w-0">
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 truncate">
            {title}
          </h1>
          {badge && (
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200 shrink-0">
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs sm:text-sm text-slate-500 mt-1 truncate" title={description}>
            {description}
          </p>
        )}
      </div>

      {children && (
        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto shrink-0">
          {children}
        </div>
      )}
    </div>
  );
}
