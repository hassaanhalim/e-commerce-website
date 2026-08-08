import { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import { adminApi, type BackendCustomerDetail } from "../../services/admin-api";
import { formatPrice } from "../../utils/formatPrice";

export function CustomerDetailPage() {
  const { customerId } = useParams<{ customerId: string }>();

  const [customer, setCustomer] = useState<BackendCustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const fetchCustomer = () => {
    if (!customerId) return;
    setLoading(true);
    adminApi
      .getCustomerById(customerId)
      .then((data) => setCustomer(data))
      .catch((err: unknown) => {
        const msg = typeof err === "object" && err !== null && "message" in err
          ? (err as { message: string }).message
          : "Customer record not found.";
        setError(msg);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCustomer();
  }, [customerId]);

  const handleToggleStatus = async () => {
    if (!customer) return;
    setActionMessage("");
    try {
      await adminApi.updateCustomerStatus(customer.id, !customer.isActive);
      setActionMessage(`Customer "${customer.fullName}" status updated.`);
      fetchCustomer();
    } catch (err: unknown) {
      const msg = typeof err === "object" && err !== null && "message" in err
        ? (err as { message: string }).message
        : "Failed to update customer status.";
      setError(msg);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-black border-t-transparent" />
        <p className="mt-3 text-xs font-semibold text-gray-400">Loading customer profile...</p>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center space-y-3">
        <p className="text-base font-bold text-gray-900">Customer Not Found</p>
        <p className="text-xs text-gray-500">{error || "The requested customer profile is unavailable."}</p>
        <Link to="/admin/customers" className="inline-block mt-4 rounded-xl bg-black px-5 py-2.5 text-xs font-bold text-white">
          Return to Customer Directory
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/customers"
            className="rounded-xl border border-gray-300 bg-white p-2 text-gray-500 hover:border-black hover:text-black transition"
          >
            ←
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-extrabold text-gray-950">{customer.fullName}</h1>
              <span
                className={`rounded-md px-2.5 py-0.5 text-xs font-bold ${
                  customer.isActive ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                }`}
              >
                {customer.isActive ? "Active Account" : "Deactivated"}
              </span>
            </div>
            <p className="text-xs font-semibold text-gray-500 mt-0.5">
              Registered on {new Date(customer.createdAt).toLocaleDateString("en-PK")}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggleStatus}
          className={`rounded-xl px-4 py-2 text-xs font-bold transition cursor-pointer ${
            customer.isActive
              ? "border border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
              : "border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          }`}
        >
          {customer.isActive ? "Deactivate Customer" : "Activate Customer"}
        </button>
      </div>

      {actionMessage && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-800">
          ✓ {actionMessage}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Personal Info & Saved Addresses */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-4 text-xs font-medium">
            <h3 className="font-bold text-gray-400 uppercase tracking-wider">Customer Profile</h3>
            <div>
              <p className="text-gray-500 font-bold uppercase text-[10px]">Email</p>
              <p className="font-bold text-gray-900 text-sm">{customer.email}</p>
            </div>
            <div>
              <p className="text-gray-500 font-bold uppercase text-[10px]">Phone</p>
              <p className="font-bold text-gray-700">{customer.phone || "—"}</p>
            </div>
            <div className="border-t border-gray-100 pt-3 flex justify-between">
              <span className="text-gray-500">Total Orders</span>
              <span className="font-bold text-gray-900">{customer.orderCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Total Spent</span>
              <span className="font-extrabold text-emerald-700">{formatPrice(customer.totalSpent)}</span>
            </div>
          </div>

          {/* Saved Addresses */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-3 text-xs">
            <h3 className="font-bold text-gray-400 uppercase tracking-wider">Saved Addresses</h3>
            {customer.addresses.length === 0 ? (
              <p className="text-gray-400 font-medium italic">No addresses registered.</p>
            ) : (
              <div className="space-y-3 divide-y divide-gray-100">
                {customer.addresses.map((addr) => (
                  <div key={addr.id} className="pt-2 space-y-0.5">
                    <p className="font-bold text-gray-900">{addr.recipientName} {addr.isDefault && <span className="text-emerald-700 text-[10px]">(Default)</span>}</p>
                    <p className="text-gray-600">{addr.addressLine1}</p>
                    <p className="text-gray-500">{addr.city}, {addr.country}</p>
                    <p className="text-gray-400">📞 {addr.phone}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Order History, Reviews, Returns */}
        <div className="md:col-span-2 space-y-6">
          {/* Recent Orders */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Recent Orders</h3>
            {customer.orders.length === 0 ? (
              <p className="text-xs text-gray-400 font-medium italic">No order history available for this customer.</p>
            ) : (
              <div className="divide-y divide-gray-150">
                {customer.orders.map((ord) => (
                  <div key={ord.id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <Link to={`/admin/orders/${ord.id}`} className="font-mono font-bold text-gray-950 hover:underline">
                        {ord.orderNumber}
                      </Link>
                      <p className="text-[11px] text-gray-400">{new Date(ord.createdAt).toLocaleDateString("en-PK")}</p>
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

          {/* Customer Reviews */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Product Reviews Submitted</h3>
            {customer.reviews.length === 0 ? (
              <p className="text-xs text-gray-400 font-medium italic">No reviews submitted.</p>
            ) : (
              <div className="space-y-3">
                {customer.reviews.map((rev) => (
                  <div key={rev.id} className="rounded-xl border border-gray-150 bg-gray-50 p-3.5 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900">{rev.product?.name || "Product"}</span>
                      <span className="font-bold text-amber-500">{"★".repeat(rev.rating)} ({rev.status})</span>
                    </div>
                    {rev.title && <p className="font-semibold text-gray-800">{rev.title}</p>}
                    <p className="text-gray-600 leading-relaxed">{rev.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Return & Exchange Requests */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Return & Exchange Requests</h3>
            {customer.returnRequests.length === 0 ? (
              <p className="text-xs text-gray-400 font-medium italic">No return or exchange requests.</p>
            ) : (
              <div className="space-y-3">
                {customer.returnRequests.map((ret) => (
                  <div key={ret.id} className="rounded-xl border border-gray-150 bg-gray-50 p-3.5 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-mono font-bold text-gray-950">{ret.requestNumber}</span>
                      <p className="text-gray-500 text-[11px]">Type: {ret.type} · Reason: {ret.reason}</p>
                    </div>

                    <div className="text-right">
                      <span className="rounded bg-gray-200 px-2 py-0.5 text-[10px] font-bold text-gray-800 uppercase">
                        {ret.status}
                      </span>
                      {Number(ret.refundAmount) > 0 && (
                        <p className="font-bold text-emerald-700 text-xs mt-1">{formatPrice(Number(ret.refundAmount))}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CustomerDetailPage;
