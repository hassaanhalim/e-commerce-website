import { useEffect, useState } from "react";
import { useParams, Link } from "react-router";
import {
  adminApi,
  type BackendCustomerDetail,
  type CustomerConversationSummary,
  type CustomerConversationDetail,
} from "../../services/admin-api";
import { formatPrice } from "../../utils/formatPrice";
import {
  CheckCircleIcon,
  PhoneIcon,
  StarRating,
  MessageIcon,
  SparklesIcon,
  ShoppingBagIcon,
} from "../../components/common/Icons";

export function CustomerDetailPage() {
  const { customerId } = useParams<{ customerId: string }>();

  const [customer, setCustomer] = useState<BackendCustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"activity" | "chat">("activity");

  // Chat conversations state
  const [conversations, setConversations] = useState<CustomerConversationSummary[]>([]);
  const [totalConversations, setTotalConversations] = useState(0);
  const [latestConversationAt, setLatestConversationAt] = useState<string | null>(null);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<CustomerConversationDetail | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);

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

  const fetchConversations = () => {
    if (!customerId) return;
    setLoadingConversations(true);
    adminApi
      .getCustomerConversations(customerId)
      .then((res) => {
        setConversations(res.conversations);
        setTotalConversations(res.totalConversations);
        setLatestConversationAt(res.latestConversationAt);
        if (res.conversations.length > 0 && !selectedConversationId) {
          loadConversationThread(res.conversations[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingConversations(false));
  };

  const loadConversationThread = (convId: string) => {
    if (!customerId) return;
    setSelectedConversationId(convId);
    setLoadingThread(true);
    adminApi
      .getCustomerConversationById(customerId, convId)
      .then((data) => setSelectedConversation(data))
      .catch(() => setSelectedConversation(null))
      .finally(() => setLoadingThread(false));
  };

  useEffect(() => {
    fetchCustomer();
    fetchConversations();
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
    <div className="mx-auto max-w-5xl space-y-6">
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
        <div className="flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-800">
          <CheckCircleIcon className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 gap-6">
        <button
          type="button"
          onClick={() => setActiveTab("activity")}
          className={`pb-3 text-xs font-bold transition cursor-pointer border-b-2 ${
            activeTab === "activity"
              ? "border-black text-gray-950"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          Orders & Activity ({customer.orderCount})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("chat")}
          className={`pb-3 text-xs font-bold transition cursor-pointer border-b-2 flex items-center gap-1.5 ${
            activeTab === "chat"
              ? "border-black text-gray-950"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          <span>Chat Conversations</span>
          <span className="rounded-full bg-gray-150 px-2 py-0.2 text-[10px] font-bold text-gray-700">
            {totalConversations}
          </span>
        </button>
      </div>

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
              <span className="text-gray-500">Chat Conversations</span>
              <span className="font-bold text-gray-900">{totalConversations}</span>
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
                    <p className="text-gray-400 flex items-center gap-1.5">
                      <PhoneIcon className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                      <span>{addr.phone}</span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Dynamic Tab Content */}
        <div className="md:col-span-2 space-y-6">
          {activeTab === "activity" ? (
            <>
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
                          <div className="flex items-center gap-1.5">
                            <StarRating rating={rev.rating} starClassName="h-3 w-3" />
                            <span className="text-[11px] text-gray-500 font-medium">({rev.status})</span>
                          </div>
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
            </>
          ) : (
            /* Chat Conversations Tab */
            <div className="space-y-6">
              {/* Summary Stats Card */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
                  <p className="text-gray-400 font-bold uppercase text-[10px]">Total Conversations</p>
                  <p className="text-2xl font-extrabold text-gray-950 mt-1">{totalConversations}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Persisted Shopping Assistant sessions</p>
                </div>
                <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
                  <p className="text-gray-400 font-bold uppercase text-[10px]">Latest Chat Activity</p>
                  <p className="text-sm font-bold text-gray-950 mt-2">
                    {latestConversationAt
                      ? new Date(latestConversationAt).toLocaleDateString("en-PK", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "No activity"}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">Most recent user or assistant message</p>
                </div>
              </div>

              {loadingConversations ? (
                <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-black border-t-transparent" />
                  <p className="mt-2 text-xs font-semibold text-gray-400">Loading chat history...</p>
                </div>
              ) : conversations.length === 0 ? (
                <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center space-y-2">
                  <div className="flex justify-center text-gray-400">
                    <MessageIcon className="h-10 w-10" />
                  </div>
                  <p className="text-sm font-bold text-gray-900">No Shopping Assistant conversations yet.</p>
                  <p className="text-xs text-gray-500 max-w-sm mx-auto">
                    When this customer interacts with the AI Shopping Assistant, their conversation sessions and recommended product references will appear here.
                  </p>
                </div>
              ) : (
                <div className="grid gap-6 lg:grid-cols-12">
                  {/* Conversation List (Left side: 5 cols) */}
                  <div className="lg:col-span-5 space-y-2.5">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">
                      Conversation Sessions ({conversations.length})
                    </h3>
                    <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
                      {conversations.map((conv, idx) => {
                        const isSelected = selectedConversationId === conv.id;
                        return (
                          <div
                            key={conv.id}
                            onClick={() => loadConversationThread(conv.id)}
                            className={`p-3.5 rounded-xl border transition cursor-pointer text-xs space-y-1.5 ${
                              isSelected
                                ? "border-black bg-gray-50 shadow-xs"
                                : "border-gray-200 bg-white hover:border-gray-300"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-gray-900 flex items-center gap-1.5">
                                <span className="text-gray-400 font-mono text-[11px]">#{idx + 1}</span>
                                <span>
                                  {new Date(conv.createdAt).toLocaleDateString("en-PK", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })}
                                </span>
                              </span>
                              <span className="rounded-md bg-gray-200 px-2 py-0.5 text-[10px] font-bold text-gray-700">
                                {conv.messageCount} msgs
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-400">
                              Last active: {new Date(conv.lastMessageAt).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}
                            </p>
                            {conv.lastMessageSnippet && (
                              <p className="text-gray-600 line-clamp-2 italic text-[11px]">
                                "{conv.lastMessageSnippet}"
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Conversation Thread Viewer (Right side: 7 cols) */}
                  <div className="lg:col-span-7">
                    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs space-y-4 min-h-[400px]">
                      {loadingThread ? (
                        <div className="py-20 text-center">
                          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-black border-t-transparent" />
                          <p className="mt-2 text-xs font-semibold text-gray-400">Loading conversation thread...</p>
                        </div>
                      ) : !selectedConversation ? (
                        <div className="py-20 text-center text-xs text-gray-400 font-medium">
                          Select a conversation to view the full message thread.
                        </div>
                      ) : (
                        <>
                          {/* Thread Header */}
                          <div className="border-b border-gray-150 pb-3 flex items-center justify-between text-xs">
                            <div>
                              <p className="font-bold text-gray-900">
                                Conversation Thread
                              </p>
                              <p className="text-[11px] text-gray-400">
                                Started {new Date(selectedConversation.createdAt).toLocaleString("en-PK")}
                              </p>
                            </div>
                            <span className="font-mono text-[10px] text-gray-400">
                              ID: {selectedConversation.id.slice(0, 8)}...
                            </span>
                          </div>

                          {/* Message Bubbles (Chronological) */}
                          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                            {selectedConversation.messages.map((msg) => {
                              const isUser = msg.role === "user";
                              return (
                                <div
                                  key={msg.id}
                                  className={`flex flex-col ${isUser ? "items-end" : "items-start"} space-y-1.5`}
                                >
                                  <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-semibold px-1">
                                    <span>
                                      {isUser ? (
                                        customer.fullName
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-purple-600">
                                          <SparklesIcon className="h-3 w-3" />
                                          <span>Shopping Assistant</span>
                                        </span>
                                      )}
                                    </span>
                                    <span>·</span>
                                    <span>{new Date(msg.createdAt).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}</span>
                                  </div>

                                  <div
                                    className={`rounded-2xl px-4 py-3 text-xs leading-relaxed max-w-[90%] ${
                                      isUser
                                        ? "bg-black text-white font-medium rounded-tr-xs"
                                        : "bg-gray-100 text-gray-900 border border-gray-200 rounded-tl-xs"
                                    }`}
                                  >
                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                  </div>

                                  {/* Product Recommendation References */}
                                  {!isUser && msg.products && msg.products.length > 0 && (
                                    <div className="w-full max-w-[95%] space-y-2 pt-1">
                                      <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                        Recommended Products ({msg.products.length})
                                      </p>
                                      <div className="grid gap-2 sm:grid-cols-2">
                                        {msg.products.map((prod) => (
                                          <div
                                            key={prod.id}
                                            className="rounded-xl border border-gray-200 bg-white p-2.5 flex items-center gap-2.5 shadow-2xs hover:border-black transition"
                                          >
                                            {prod.image ? (
                                              <img
                                                src={prod.image}
                                                alt={prod.name}
                                                className="h-12 w-12 rounded-lg object-cover bg-gray-50 flex-shrink-0"
                                              />
                                            ) : (
                                              <div className="h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 flex-shrink-0">
                                                <ShoppingBagIcon className="h-5 w-5" />
                                              </div>
                                            )}

                                            <div className="min-w-0 flex-1 text-[11px]">
                                              <p className="font-bold text-gray-900 truncate">{prod.name}</p>
                                              <p className="text-[10px] text-gray-500 truncate">{prod.brand} · {prod.category}</p>
                                              <div className="flex items-center justify-between mt-1">
                                                <span className="font-extrabold text-emerald-700 text-xs">
                                                  {formatPrice(prod.displayPrice)}
                                                </span>
                                                <span
                                                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                                                    prod.inStock
                                                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                                      : "bg-red-50 text-red-700 border border-red-200"
                                                  }`}
                                                >
                                                  {prod.inStock ? "In Stock" : "Out of Stock"}
                                                </span>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CustomerDetailPage;
