import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { orderApi } from "../../services/order-api";
import type { BackendOrder } from "../../types/order";
import { formatPrice } from "../../utils/formatPrice";

export function AccountDashboard() {
  const { user, getAddresses } = useAuth();
  const [customerOrders, setCustomerOrders] = useState<BackendOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    orderApi
      .getCustomerOrders({ page: 1, limit: 100 })
      .then((res) => {
        setCustomerOrders(res.data || []);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load orders.");
      })
      .finally(() => setLoading(false));
  }, [user]);

  // Calculate quick stats
  const stats = useMemo(() => {
    const nonCancelled = customerOrders.filter((o) => o.status !== "CANCELLED");
    const totalSpent = nonCancelled.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    return {
      totalOrders: customerOrders.length,
      totalSpent,
    };
  }, [customerOrders]);

  // Get default address
  const defaultAddress = useMemo(() => {
    const list = getAddresses();
    return list.find((a) => a.isDefault);
  }, [getAddresses]);

  const recentOrders = useMemo(() => {
    return [...customerOrders]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3);
  }, [customerOrders]);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of your account activity, shipping preferences, and recent purchases.
        </p>
      </div>

      {/* KPI Stats cards */}
      <section className="grid gap-5 sm:grid-cols-2">
        <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Orders Placed</p>
          <p className="mt-2 text-3xl font-extrabold text-gray-900">{stats.totalOrders}</p>
          <p className="mt-1.5 text-xs text-gray-500 font-medium">Includes processing and delivery items.</p>
        </article>

        <article className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Total Spent Amount</p>
          <p className="mt-2 text-3xl font-extrabold text-gray-900">{formatPrice(stats.totalSpent)}</p>
          <p className="mt-1.5 text-xs text-gray-500 font-medium">Excludes cancelled transactions.</p>
        </article>
      </section>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Recent Orders Log list */}
        <section className="md:col-span-2 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h2 className="text-base font-bold text-gray-900">Recent Purchases</h2>
            <Link to="/account/orders" className="text-xs font-bold uppercase text-gray-500 hover:text-black transition">
              View All Orders →
            </Link>
          </div>
          <div className="divide-y divide-gray-100 mt-2">
            {loading ? (
              <p className="text-sm font-semibold text-gray-400 py-8 text-center">Loading orders...</p>
            ) : error ? (
              <p className="text-sm font-semibold text-red-500 py-8 text-center">{error}</p>
            ) : recentOrders.length === 0 ? (
              <p className="text-sm font-semibold text-gray-400 py-8 text-center">You haven't placed any orders yet.</p>
            ) : (
              recentOrders.map((o) => (
                <div key={o.id} className="flex items-center justify-between py-4 first:pt-2 last:pb-0">
                  <div>
                    <p className="font-bold text-gray-900">{o.orderNumber}</p>
                    <p className="text-xs text-gray-400 font-medium mt-0.5">
                      Placed on {new Date(o.createdAt).toLocaleDateString("en-PK", { dateStyle: "medium" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-gray-900 text-sm">{formatPrice(o.total)}</span>
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-800">
                      {o.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Default Shipping Address */}
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3">
              Default Address
            </h2>
            {defaultAddress ? (
              <div className="mt-4 text-sm text-gray-700 leading-relaxed font-medium">
                <p className="font-bold text-gray-900">{defaultAddress.fullName}</p>
                <p>{defaultAddress.addressLine1}</p>
                {defaultAddress.addressLine2 && <p>{defaultAddress.addressLine2}</p>}
                <p>
                  {defaultAddress.city}, {defaultAddress.province}
                </p>
                {defaultAddress.postalCode && <p>Postal Code: {defaultAddress.postalCode}</p>}
                <p className="mt-2 text-xs text-gray-400">Phone: {defaultAddress.phone}</p>
              </div>
            ) : (
              <p className="text-sm font-semibold text-gray-400 mt-4 leading-normal">
                No default shipping address configured yet.
              </p>
            )}
          </div>
          <Link
            to="/account/addresses"
            className="block text-center mt-6 rounded-xl border border-gray-300 bg-white py-2 text-xs font-bold text-gray-700 hover:border-black hover:text-black transition"
          >
            Manage Addresses
          </Link>
        </section>
      </div>
    </div>
  );
}

export default AccountDashboard;
