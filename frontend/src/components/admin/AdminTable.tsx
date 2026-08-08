import React, { useState, useMemo } from "react";

export interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  sortable?: boolean;
  className?: string;
}

interface AdminTableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchPlaceholder?: string;
  searchKeys?: (keyof T)[];
  actions?: (row: T) => React.ReactNode;
  title?: string;
  subtitle?: string;
  primaryAction?: React.ReactNode;
}

export function AdminTable<T extends { id: string | number }>({
  columns,
  data,
  searchPlaceholder = "Search...",
  searchKeys = [],
  actions,
  title,
  subtitle,
  primaryAction,
}: AdminTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: keyof T | string; direction: "asc" | "desc" } | null>(null);

  // Sorting
  const sortedData = useMemo(() => {
    if (!sortConfig) return data;
    const sorted = [...data];
    sorted.sort((a, b) => {
      let aValue: any = a[sortConfig.key as keyof T];
      let bValue: any = b[sortConfig.key as keyof T];

      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [data, sortConfig]);

  // Filtering
  const filteredData = useMemo(() => {
    if (!searchQuery || searchKeys.length === 0) return sortedData;
    const query = searchQuery.toLowerCase().trim();
    return sortedData.filter((row) =>
      searchKeys.some((key) => {
        const val = row[key];
        if (val === undefined || val === null) return false;
        return String(val).toLowerCase().includes(query);
      })
    );
  }, [sortedData, searchQuery, searchKeys]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  // Reset pagination on search
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const requestSort = (key: keyof T | string) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Table Title & Actions Row */}
      {(title || subtitle || primaryAction) && (
        <div className="flex flex-col gap-4 border-b border-gray-200 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {title && <h2 className="text-xl font-bold text-gray-900 tracking-tight">{title}</h2>}
            {subtitle && <p className="mt-1 text-sm text-gray-500 font-medium">{subtitle}</p>}
          </div>
          {primaryAction && <div className="shrink-0">{primaryAction}</div>}
        </div>
      )}

      {/* Toolbar: Search input + entries count */}
      <div className="flex flex-col gap-4 border-b border-gray-200 bg-gray-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        {searchKeys.length > 0 && (
          <div className="relative max-w-sm flex-1">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={handleSearchChange}
              className="w-full rounded-xl border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm outline-none transition focus:border-black focus:ring-1 focus:ring-black"
            />
          </div>
        )}

        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase ml-auto">
          <span>Show:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="rounded-lg border border-gray-300 bg-white px-2 py-1 outline-none focus:border-black cursor-pointer"
          >
            {[5, 10, 25, 50].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <span>Entries</span>
        </div>
      </div>

      {/* Table View */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm text-gray-500">
          <thead className="bg-gray-50 text-xs font-bold uppercase tracking-wider text-gray-600 border-b border-gray-200">
            <tr>
              {columns.map((col, index) => (
                <th
                  key={index}
                  scope="col"
                  onClick={() => col.sortable && typeof col.accessor === "string" && requestSort(col.accessor as string)}
                  className={`px-6 py-4 font-bold ${col.sortable ? "cursor-pointer select-none hover:bg-gray-100 hover:text-gray-900" : ""} ${col.className || ""}`}
                >
                  <div className="flex items-center gap-1.5">
                    {col.header}
                    {col.sortable && sortConfig?.key === col.accessor && (
                      <span className="text-gray-400">
                        {sortConfig.direction === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              {actions && <th scope="col" className="px-6 py-4 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white font-medium text-gray-700">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="px-6 py-12 text-center text-gray-400 font-semibold">
                  No records found.
                </td>
              </tr>
            ) : (
              paginatedData.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50/50 transition">
                  {columns.map((col, idx) => {
                    let content: React.ReactNode;
                    if (typeof col.accessor === "function") {
                      content = col.accessor(row);
                    } else {
                      const val = row[col.accessor as keyof T];
                      content = val !== undefined && val !== null ? String(val) : "";
                    }
                    return (
                      <td key={idx} className={`px-6 py-4 whitespace-nowrap ${col.className || ""}`}>
                        {content}
                      </td>
                    );
                  })}
                  {actions && (
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {actions(row)}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex flex-col gap-4 border-t border-gray-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-gray-500">
            Showing <span className="font-semibold text-gray-900">{(currentPage - 1) * pageSize + 1}</span> to{" "}
            <span className="font-semibold text-gray-900">
              {Math.min(currentPage * pageSize, filteredData.length)}
            </span>{" "}
            of <span className="font-semibold text-gray-900">{filteredData.length}</span> entries
          </p>

          <div className="inline-flex gap-1.5 self-end">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((c) => Math.max(1, c - 1))}
              className="rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white outline-none cursor-pointer"
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => setCurrentPage(page)}
                className={`rounded-xl px-3.5 py-2 text-sm font-semibold transition outline-none cursor-pointer ${
                  currentPage === page
                    ? "bg-black text-white hover:bg-gray-800"
                    : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {page}
              </button>
            ))}
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((c) => Math.min(totalPages, c + 1))}
              className="rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-white outline-none cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminTable;
