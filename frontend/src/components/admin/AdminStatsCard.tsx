import React from "react";

interface AdminStatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down" | "neutral";
  description?: string;
  icon?: React.ReactNode;
}

export function AdminStatsCard({
  title,
  value,
  change,
  trend = "neutral",
  description,
  icon,
}: AdminStatsCardProps) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm hover:shadow-md transition">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{title}</p>
        {icon && <div className="text-gray-400 bg-gray-50 rounded-xl p-2.5">{icon}</div>}
      </div>

      <div className="mt-4 flex items-baseline gap-2">
        <span className="text-3xl font-extrabold text-gray-900 tracking-tight">{value}</span>
        {change && (
          <span
            className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-semibold ${
              trend === "up"
                ? "bg-green-50 text-green-700"
                : trend === "down"
                ? "bg-red-50 text-red-700"
                : "bg-gray-50 text-gray-700"
            }`}
          >
            {trend === "up" && "↑ "}
            {trend === "down" && "↓ "}
            {change}
          </span>
        )}
      </div>

      {description && <p className="mt-2 text-xs text-gray-500 font-medium">{description}</p>}
    </article>
  );
}

export default AdminStatsCard;
