import { useEffect, useState } from "react";
import { adminApi } from "../../services/admin-api";
import { formatPrice } from "../../utils/formatPrice";
import { DownloadIcon } from "../../components/common/Icons";

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState<"sales" | "orders" | "products" | "inventory" | "customers" | "returns">("sales");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  const fetchReport = () => {
    setLoading(true);
    const filter = { from: fromDate || undefined, to: toDate || undefined };

    let promise: Promise<any>;
    if (activeTab === "sales") promise = adminApi.getSalesReport(filter);
    else if (activeTab === "orders") promise = adminApi.getOrdersReport(filter);
    else if (activeTab === "products") promise = adminApi.getProductsReport(filter);
    else if (activeTab === "inventory") promise = adminApi.getInventoryReport();
    else if (activeTab === "customers") promise = adminApi.getCustomersReport(filter);
    else promise = adminApi.getReturnsReport(filter);

    promise
      .then((res) => setReportData(res))
      .catch(() => setReportData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReport();
  }, [activeTab]);

  const handleExportCSV = () => {
    const filter = `?from=${encodeURIComponent(fromDate)}&to=${encodeURIComponent(toDate)}`;
    let exportUrl = "";
    if (activeTab === "sales") exportUrl = `/api/v1/admin/reports/sales/export${filter}`;
    else if (activeTab === "orders") exportUrl = `/api/v1/admin/reports/orders/export${filter}`;
    else if (activeTab === "inventory") exportUrl = `/api/v1/admin/reports/inventory/export`;

    if (exportUrl) {
      window.open(exportUrl, "_blank");
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-950 tracking-tight">Business Intelligence Reports</h1>
          <p className="text-xs text-gray-500 font-medium">Authoritative backend database reporting & analytics.</p>
        </div>

        {/* Date Filter & Export */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-gray-400">From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="rounded-xl border border-gray-300 px-2.5 py-1 font-mono text-xs outline-none"
            />
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="font-bold text-gray-400">To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="rounded-xl border border-gray-300 px-2.5 py-1 font-mono text-xs outline-none"
            />
          </div>

          <button
            type="button"
            onClick={fetchReport}
            className="rounded-xl bg-black px-4 py-1.5 text-xs font-bold text-white hover:bg-gray-800 transition cursor-pointer"
          >
            Apply Filter
          </button>

          {(activeTab === "sales" || activeTab === "orders" || activeTab === "inventory") && (
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition cursor-pointer"
            >
              <DownloadIcon className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 overflow-x-auto text-xs font-bold">
        {(["sales", "orders", "products", "inventory", "customers", "returns"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-3 border-b-2 transition uppercase tracking-wider cursor-pointer ${
              activeTab === tab ? "border-black text-black" : "border-transparent text-gray-400 hover:text-gray-800"
            }`}
          >
            {tab} Report
          </button>
        ))}
      </div>

      {/* Report Content Display */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-black border-t-transparent" />
          <p className="mt-3 text-xs font-semibold text-gray-400">Querying database metrics...</p>
        </div>
      ) : !reportData ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center text-xs text-gray-500">
          No report data available for selected filter.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Sales Report Tab */}
          {activeTab === "sales" && (
            <div className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-1">
                  <p className="text-xs font-bold text-gray-400 uppercase">Gross Paid Revenue</p>
                  <p className="text-2xl font-extrabold text-gray-950">{formatPrice(reportData.grossPaidRevenue)}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-1">
                  <p className="text-xs font-bold text-gray-400 uppercase">Refunds Processed</p>
                  <p className="text-2xl font-extrabold text-red-600">{formatPrice(reportData.refunds)}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-1">
                  <p className="text-xs font-bold text-gray-400 uppercase">Net Revenue</p>
                  <p className="text-2xl font-extrabold text-emerald-700">{formatPrice(reportData.netRevenue)}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-1">
                  <p className="text-xs font-bold text-gray-400 uppercase">Average Order Value</p>
                  <p className="text-2xl font-extrabold text-gray-950">{formatPrice(reportData.averageOrderValue)}</p>
                </div>
              </div>

              {reportData.revenueTrend?.length > 0 && (
                <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Revenue Trend Breakdown</h3>
                  <div className="divide-y divide-gray-150">
                    {reportData.revenueTrend.map((t: any) => (
                      <div key={t.date} className="py-2.5 flex items-center justify-between text-xs font-medium">
                        <span className="font-mono text-gray-700">{t.date}</span>
                        <span className="text-gray-500">{t.count} paid orders</span>
                        <span className="font-extrabold text-gray-950">{formatPrice(t.gross)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Orders Report Tab */}
          {activeTab === "orders" && (
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-3 text-xs">
                <h3 className="font-bold text-gray-400 uppercase tracking-wider">Orders by Status</h3>
                {reportData.ordersByStatus?.map((s: any) => (
                  <div key={s.status} className="flex justify-between font-medium">
                    <span className="font-bold text-gray-800">{s.status}</span>
                    <span className="font-mono text-gray-600">{s.count}</span>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-3 text-xs">
                <h3 className="font-bold text-gray-400 uppercase tracking-wider">Orders by Payment Method</h3>
                {reportData.ordersByPaymentMethod?.map((m: any) => (
                  <div key={m.method} className="flex justify-between font-medium">
                    <span className="font-bold text-gray-800">{m.method === "CASH_ON_DELIVERY" ? "COD" : "Mock Online"}</span>
                    <span className="font-mono text-gray-600">{m.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Products Report Tab */}
          {activeTab === "products" && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-4 text-xs">
              <h3 className="font-bold text-gray-400 uppercase tracking-wider">Top Selling Products</h3>
              <div className="divide-y divide-gray-150">
                {reportData.topSellingProducts?.map((p: any) => (
                  <div key={p.productId} className="py-3 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-gray-950">{p.productName}</p>
                      <p className="text-[11px] text-gray-400">Units Sold: {p.unitsSold}</p>
                    </div>
                    <span className="font-extrabold text-emerald-700 text-sm">{formatPrice(p.totalRevenue)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inventory Report Tab */}
          {activeTab === "inventory" && (
            <div className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-3">
                <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-1">
                  <p className="text-xs font-bold text-gray-400 uppercase">Total On Hand</p>
                  <p className="text-2xl font-extrabold text-gray-950">{reportData.totalOnHand}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-1">
                  <p className="text-xs font-bold text-gray-400 uppercase">Total Reserved</p>
                  <p className="text-2xl font-extrabold text-amber-600">{reportData.totalReserved}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-1">
                  <p className="text-xs font-bold text-gray-400 uppercase">Total Available</p>
                  <p className="text-2xl font-extrabold text-emerald-700">{reportData.totalAvailable}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-3 text-xs">
                <h3 className="font-bold text-gray-400 uppercase tracking-wider">Inventory Variants Overview</h3>
                <div className="divide-y divide-gray-150 max-h-96 overflow-y-auto">
                  {reportData.variants?.map((v: any) => (
                    <div key={v.variantId} className="py-2 flex items-center justify-between font-medium">
                      <div>
                        <p className="font-bold text-gray-900">{v.productName} ({v.sku})</p>
                        <p className="text-[11px] text-gray-500">Size: {v.size} · Color: {v.color}</p>
                      </div>
                      <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                        v.status === "OUT_OF_STOCK" ? "bg-red-100 text-red-800" : v.status === "LOW_STOCK" ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"
                      }`}>
                        {v.status} ({v.availableQuantity} avail)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Customers Report Tab */}
          {activeTab === "customers" && (
            <div className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-3">
                <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-1">
                  <p className="text-xs font-bold text-gray-400 uppercase">Total Customers</p>
                  <p className="text-2xl font-extrabold text-gray-950">{reportData.totalCustomers}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-1">
                  <p className="text-xs font-bold text-gray-400 uppercase">Active Accounts</p>
                  <p className="text-2xl font-extrabold text-emerald-700">{reportData.activeCustomers}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-1">
                  <p className="text-xs font-bold text-gray-400 uppercase">Deactivated Accounts</p>
                  <p className="text-2xl font-extrabold text-red-600">{reportData.inactiveCustomers}</p>
                </div>
              </div>
            </div>
          )}

          {/* Returns Report Tab */}
          {activeTab === "returns" && (
            <div className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-1">
                  <p className="text-xs font-bold text-gray-400 uppercase">Total Return Requests</p>
                  <p className="text-2xl font-extrabold text-gray-950">{reportData.totalRequests}</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-1">
                  <p className="text-xs font-bold text-gray-400 uppercase">Completed Refunds Total</p>
                  <p className="text-2xl font-extrabold text-emerald-700">{formatPrice(reportData.completedRefundAmount)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ReportsPage;
