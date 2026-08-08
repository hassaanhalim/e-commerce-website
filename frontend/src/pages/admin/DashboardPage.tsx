import { useEffect, useState } from "react";
import { Link } from "react-router";
import { adminApi, type BackendDashboardSummary } from "../../services/admin-api";
import { formatPrice } from "../../utils/formatPrice";
import AdminStatsCard from "../../components/admin/AdminStatsCard";

export function DashboardPage() {
  const [summary, setSummary] = useState<BackendDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .getDashboardSummary()
      .then((data) => setSummary(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-black border-t-transparent" />
        <p className="mt-3 text-xs font-semibold text-gray-400">Loading store dashboard analytics...</p>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center text-xs text-gray-500">
        Dashboard summary metrics unavailable.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Store Overview</h1>
        <p className="mt-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Real-Time Database Analytics & Key Performance Indicators
        </p>
      </div>

      {/* KPI Row 1 */}
      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatsCard
          title="Gross Paid Revenue"
          value={formatPrice(summary.grossPaidRevenue)}
          description="Total revenue from paid orders"
          icon={<span className="text-xl">💰</span>}
        />
        <AdminStatsCard
          title="Net Revenue"
          value={formatPrice(summary.netRevenue)}
          description={`Gross (${formatPrice(summary.grossPaidRevenue)}) − Refunds (${formatPrice(summary.refundedAmount)})`}
          icon={<span className="text-xl">📈</span>}
        />
        <AdminStatsCard
          title="Total Orders"
          value={summary.totalOrders}
          description={`AOV: ${formatPrice(summary.averageOrderValue)}`}
          icon={<span className="text-xl">📦</span>}
        />
        <AdminStatsCard
          title="Total Customers"
          value={summary.totalCustomers}
          description={`${summary.newCustomers} new customers registered`}
          icon={<span className="text-xl">👥</span>}
        />
      </section>

      {/* KPI Row 2 - Operational Inventory & Tasks */}
      <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStatsCard
          title="Low Stock Variants"
          value={summary.lowStockVariants}
          description="Variants at or below low stock threshold"
          icon={<span className="text-xl">⚠️</span>}
        />
        <AdminStatsCard
          title="Out of Stock Variants"
          value={summary.outOfStockVariants}
          description="Variants with 0 available stock"
          icon={<span className="text-xl">🚫</span>}
        />
        <AdminStatsCard
          title="Pending Reviews"
          value={summary.pendingReviews}
          description="Customer reviews awaiting moderation"
          icon={<span className="text-xl">★</span>}
        />
        <AdminStatsCard
          title="Open Returns / Exchanges"
          value={summary.openReturns}
          description="Return requests requiring admin decision"
          icon={<span className="text-xl">↩</span>}
        />
      </section>

      {/* Recent Orders & Recent Inventory Adjustments Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Orders */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Recent Orders</h3>
            <Link to="/admin/orders" className="text-xs font-bold text-black underline">View All</Link>
          </div>

          {summary.recentOrders.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No recent orders.</p>
          ) : (
            <div className="divide-y divide-gray-150">
              {summary.recentOrders.map((ord) => (
                <div key={ord.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <Link to={`/admin/orders/${ord.id}`} className="font-mono font-bold text-gray-950 hover:underline">
                      {ord.orderNumber}
                    </Link>
                    <p className="text-[11px] text-gray-400">{ord.customerEmail}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-700 uppercase">
                      {ord.status}
                    </span>
                    <span className="font-extrabold text-gray-950">{formatPrice(Number(ord.total))}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Inventory Adjustments */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Recent Stock Adjustments</h3>
            <Link to="/admin/inventory" className="text-xs font-bold text-black underline">Manage Inventory</Link>
          </div>

          {summary.recentInventoryAdjustments.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No inventory adjustments.</p>
          ) : (
            <div className="divide-y divide-gray-150">
              {summary.recentInventoryAdjustments.map((adj) => (
                <div key={adj.id} className="py-3 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-gray-900">{adj.inventory?.variant?.product?.name} (SKU: {adj.inventory?.variant?.sku})</p>
                    <p className="text-[11px] text-gray-500">Reason: {adj.reason}</p>
                  </div>

                  <div className="text-right">
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-800 uppercase">
                      {adj.type}
                    </span>
                    <p className="text-[11px] font-mono text-gray-600 mt-0.5">
                      Delta: {adj.onHandDelta > 0 ? `+${adj.onHandDelta}` : adj.onHandDelta}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
