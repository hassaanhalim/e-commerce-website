import { useState, useEffect, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { addressApi, checkoutApi } from "../services/checkout-api";
import { orderApi } from "../services/order-api";
import type { BackendAddress, CheckoutPreviewResult } from "../types/auth";
import type { PaymentMethod } from "../types/order";
import { formatPrice } from "../utils/formatPrice";
import {
  LocationPinIcon,
  PhoneIcon,
  TruckIcon,
  CreditCardIcon,
  CheckIcon,
  CloseIcon,
} from "../components/common/Icons";

export function CheckoutPage() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const { cartItems, cartSubtotal, refreshCart } = useCart();

  // State
  const [addresses, setAddresses] = useState<BackendAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");
  const [shippingMethod, setShippingMethod] = useState<string>("STANDARD");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH_ON_DELIVERY");
  const [customerNotes, setCustomerNotes] = useState<string>("");

  // New Address form states
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newRecipientName, setNewRecipientName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newAddressLine1, setNewAddressLine1] = useState("");
  const [newAddressLine2, setNewAddressLine2] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newStateOrProvince, setNewStateOrProvince] = useState("");
  const [newPostalCode, setNewPostalCode] = useState("");

  // Preview & Processing state
  const [preview, setPreview] = useState<CheckoutPreviewResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Mock Payment Dialog state
  const [pendingOrderId, setPendingOrderId] = useState<string | null>(null);
  const [isProcessingMockPayment, setIsProcessingMockPayment] = useState(false);

  // Load addresses on mount
  useEffect(() => {
    if (!user) return;
    addressApi
      .getAddresses()
      .then((data) => {
        setAddresses(data);
        const def = data.find((a) => a.isDefault) || data[0];
        if (def) {
          setSelectedAddressId(def.id);
        } else {
          setShowAddressForm(true);
        }
      })
      .catch(() => {});
  }, [user]);

  // Fetch checkout preview whenever address or shipping method changes
  useEffect(() => {
    if (!selectedAddressId) {
      setPreview(null);
      return;
    }

    let isMounted = true;
    setIsCalculating(true);

    checkoutApi
      .preview(selectedAddressId, shippingMethod)
      .then((res) => {
        if (isMounted) {
          setPreview(res);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          const msg = typeof err === "object" && err !== null && "message" in err
            ? (err as { message: string }).message
            : "Failed to update checkout preview.";
          setError(msg);
        }
      })
      .finally(() => {
        if (isMounted) setIsCalculating(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedAddressId, shippingMethod]);

  if (authLoading) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-24 text-center">
        <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-black border-t-transparent" />
        <p className="mt-4 text-sm font-semibold text-gray-500">Loading checkout...</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-950">Authentication Required</h1>
        <p className="mt-2 text-sm text-gray-600">Please sign in to complete your checkout and place an order.</p>
        <Link
          to="/login?redirect=/checkout"
          className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-gray-950 px-6 py-3 font-semibold text-white transition hover:bg-gray-800"
        >
          Sign In to Checkout
        </Link>
      </main>
    );
  }

  if (cartItems.length === 0 && !pendingOrderId) {
    return (
      <main className="mx-auto max-w-md px-6 py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-950">Your cart is empty</h1>
        <p className="mt-2 text-sm text-gray-600">Add items to your cart before proceeding to checkout.</p>
        <Link
          to="/shop"
          className="mt-6 inline-flex rounded-xl bg-gray-950 px-6 py-3 font-semibold text-white transition hover:bg-gray-800"
        >
          Return to Shop
        </Link>
      </main>
    );
  }

  const handleCreateAddress = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!newRecipientName || !newPhone || !newAddressLine1 || !newCity) {
      setError("Please fill in all required address fields.");
      return;
    }

    try {
      const created = await addressApi.createAddress({
        recipientName: newRecipientName,
        phone: newPhone,
        addressLine1: newAddressLine1,
        addressLine2: newAddressLine2,
        city: newCity,
        stateOrProvince: newStateOrProvince,
        postalCode: newPostalCode,
        country: "Pakistan",
        isDefault: addresses.length === 0,
      });

      setAddresses((prev) => [...prev, created]);
      setSelectedAddressId(created.id);
      setShowAddressForm(false);
      // Reset form
      setNewRecipientName("");
      setNewPhone("");
      setNewAddressLine1("");
      setNewAddressLine2("");
      setNewCity("");
      setNewStateOrProvince("");
      setNewPostalCode("");
    } catch (err: unknown) {
      const msg = typeof err === "object" && err !== null && "message" in err
        ? (err as { message: string }).message
        : "Failed to save address.";
      setError(msg);
    }
  };

  const handlePlaceOrder = async () => {
    setError("");
    if (!selectedAddressId) {
      setError("Please select or add a delivery address.");
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Create Checkout Session
      const session = await checkoutApi.createSession({
        shippingAddressId: selectedAddressId,
        shippingMethod,
      });

      // 2. Create Order
      const order = await orderApi.createOrder({
        checkoutSessionId: session.id,
        paymentMethod,
        customerNotes,
      });

      // 3. Clear cart state
      await refreshCart();

      // 4. Handle Mock Online Payment or Cash on Delivery
      if (paymentMethod === "MOCK_ONLINE") {
        setPendingOrderId(order.id);
      } else {
        navigate(`/order-success?orderId=${order.id}`);
      }
    } catch (err: unknown) {
      const msg = typeof err === "object" && err !== null && "message" in err
        ? (err as { message: string }).message
        : "Failed to place order. Please try again.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMockPaymentResult = async (success: boolean) => {
    if (!pendingOrderId) return;
    setIsProcessingMockPayment(true);
    setError("");

    try {
      const updatedOrder = await orderApi.executeMockPayment(
        pendingOrderId,
        success,
        success ? undefined : "User simulated failed online transaction",
      );

      if (success) {
        navigate(`/order-success?orderId=${updatedOrder.id}`);
      } else {
        setError("Mock online payment failed. You can retry or manage this order in your account.");
        setPendingOrderId(null);
      }
    } catch (err: unknown) {
      const msg = typeof err === "object" && err !== null && "message" in err
        ? (err as { message: string }).message
        : "Mock payment processing failed.";
      setError(msg);
    } finally {
      setIsProcessingMockPayment(false);
    }
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 space-y-6 sm:space-y-8">
      {/* Page Header */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Secure Checkout</p>
        <h1 className="mt-1 text-3xl font-extrabold text-gray-950">Complete Your Order</h1>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm font-semibold text-red-700">
          {error}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid gap-10 lg:grid-cols-[1fr_400px]">
        {/* Left Column: Delivery Address & Shipping / Payment Options */}
        <section className="space-y-8">
          {/* Section 1: Delivery Address Selection */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-950 flex items-center gap-2">
                <LocationPinIcon className="h-5 w-5 text-[#748779]" /> Shipping Address
              </h2>
              <button
                type="button"
                onClick={() => setShowAddressForm(!showAddressForm)}
                className="text-xs font-bold text-black underline hover:text-gray-600"
              >
                {showAddressForm ? "Cancel" : "+ Add New Address"}
              </button>
            </div>

            {/* Address Form Modal / Inline */}
            {showAddressForm && (
              <form onSubmit={handleCreateAddress} className="rounded-xl bg-gray-50 border border-gray-200 p-4 space-y-3 mt-4">
                <h3 className="text-xs font-bold uppercase text-gray-500">New Address Details</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    type="text"
                    placeholder="Recipient Full Name *"
                    value={newRecipientName}
                    onChange={(e) => setNewRecipientName(e.target.value)}
                    required
                    className="rounded-lg border border-gray-300 bg-white p-2.5 text-xs font-medium focus:border-black outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Phone Number *"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    required
                    className="rounded-lg border border-gray-300 bg-white p-2.5 text-xs font-medium focus:border-black outline-none"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Address Line 1 *"
                  value={newAddressLine1}
                  onChange={(e) => setNewAddressLine1(e.target.value)}
                  required
                  className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-xs font-medium focus:border-black outline-none"
                />
                <input
                  type="text"
                  placeholder="Address Line 2 (Optional)"
                  value={newAddressLine2}
                  onChange={(e) => setNewAddressLine2(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white p-2.5 text-xs font-medium focus:border-black outline-none"
                />
                <div className="grid gap-3 sm:grid-cols-3">
                  <input
                    type="text"
                    placeholder="City *"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    required
                    className="rounded-lg border border-gray-300 bg-white p-2.5 text-xs font-medium focus:border-black outline-none"
                  />
                  <input
                    type="text"
                    placeholder="State/Province"
                    value={newStateOrProvince}
                    onChange={(e) => setNewStateOrProvince(e.target.value)}
                    className="rounded-lg border border-gray-300 bg-white p-2.5 text-xs font-medium focus:border-black outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Postal Code"
                    value={newPostalCode}
                    onChange={(e) => setNewPostalCode(e.target.value)}
                    className="rounded-lg border border-gray-300 bg-white p-2.5 text-xs font-medium focus:border-black outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="mt-2 rounded-xl bg-black px-4 py-2 text-xs font-bold text-white hover:bg-gray-800 transition"
                >
                  Save Address
                </button>
              </form>
            )}

            {/* Saved Addresses Radio List */}
            {addresses.length === 0 ? (
              <p className="text-xs text-gray-500 italic">No addresses saved. Please add a shipping address above.</p>
            ) : (
              <div className="space-y-3">
                {addresses.map((addr) => (
                  <label
                    key={addr.id}
                    className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition ${
                      selectedAddressId === addr.id
                        ? "border-black bg-gray-50/80 shadow-xs"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="shippingAddress"
                      value={addr.id}
                      checked={selectedAddressId === addr.id}
                      onChange={() => setSelectedAddressId(addr.id)}
                      className="mt-1 accent-black"
                    />
                    <div className="flex-1 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-950">{addr.recipientName}</span>
                        {addr.isDefault && (
                          <span className="rounded-md bg-gray-200 px-1.5 py-0.5 text-[10px] font-bold text-gray-700">
                            DEFAULT
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-gray-600 font-medium">{addr.addressLine1}{addr.addressLine2 ? `, ${addr.addressLine2}` : ""}</p>
                      <p className="text-gray-500">{addr.city}, {addr.stateOrProvince || ""} {addr.postalCode || ""}</p>
                      <p className="text-gray-400 mt-0.5 flex items-center gap-1.5">
                        <PhoneIcon className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        <span>{addr.phone}</span>
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Shipping Method Selection */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-gray-950 flex items-center gap-2">
              <TruckIcon className="h-5 w-5 text-[#748779]" /> Delivery Options
            </h2>

            <div className="grid gap-3 sm:grid-cols-2">
              <label
                className={`flex flex-col justify-between rounded-xl border p-4 cursor-pointer transition ${
                  shippingMethod === "STANDARD" ? "border-black bg-gray-50" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="shippingMethod"
                    value="STANDARD"
                    checked={shippingMethod === "STANDARD"}
                    onChange={() => setShippingMethod("STANDARD")}
                    className="accent-black"
                  />
                  <span className="font-bold text-xs text-gray-950">Standard Delivery</span>
                </div>
                <p className="mt-2 text-[11px] text-gray-500 font-medium">3 - 5 Business Days</p>
                <p className="mt-1 text-xs font-bold text-gray-900">
                  {cartSubtotal >= 5000 ? "FREE" : "PKR 250"}
                </p>
              </label>

              <label
                className={`flex flex-col justify-between rounded-xl border p-4 cursor-pointer transition ${
                  shippingMethod === "EXPRESS" ? "border-black bg-gray-50" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="shippingMethod"
                    value="EXPRESS"
                    checked={shippingMethod === "EXPRESS"}
                    onChange={() => setShippingMethod("EXPRESS")}
                    className="accent-black"
                  />
                  <span className="font-bold text-xs text-gray-950">Express Shipment</span>
                </div>
                <p className="mt-2 text-[11px] text-gray-500 font-medium">1 - 2 Business Days</p>
                <p className="mt-1 text-xs font-bold text-gray-900">PKR 500</p>
              </label>
            </div>
          </div>

          {/* Section 3: Payment Method Selection */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-gray-950 flex items-center gap-2">
              <CreditCardIcon className="h-5 w-5 text-[#748779]" /> Payment Method
            </h2>

            <div className="space-y-3">
              <label
                className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition ${
                  paymentMethod === "CASH_ON_DELIVERY" ? "border-black bg-gray-50" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="CASH_ON_DELIVERY"
                  checked={paymentMethod === "CASH_ON_DELIVERY"}
                  onChange={() => setPaymentMethod("CASH_ON_DELIVERY")}
                  className="mt-1 accent-black"
                />
                <div>
                  <span className="font-bold text-xs text-gray-950">Cash on Delivery (COD)</span>
                  <p className="mt-0.5 text-[11px] text-gray-500 font-medium">
                    Pay with cash upon delivery of your items. Order status starts as CONFIRMED.
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition ${
                  paymentMethod === "MOCK_ONLINE" ? "border-black bg-gray-50" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="MOCK_ONLINE"
                  checked={paymentMethod === "MOCK_ONLINE"}
                  onChange={() => setPaymentMethod("MOCK_ONLINE")}
                  className="mt-1 accent-black"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-gray-950">Mock Online Gateway</span>
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
                      DEV MODE
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-gray-500 font-medium">
                    Simulate card/online payment result safely without collecting sensitive details.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Section 4: Customer Notes */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-2">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Delivery Instructions / Order Notes</h2>
            <textarea
              rows={3}
              placeholder="e.g. Leave with gate guard or call before arrival..."
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              className="w-full rounded-xl border border-gray-300 p-3 text-xs font-medium focus:border-black outline-none"
            />
          </div>
        </section>

        {/* Right Column: Order Summary Sidebar */}
        <aside className="h-fit rounded-2xl border border-gray-200 bg-gray-50 p-6 shadow-sm space-y-6 lg:sticky lg:top-24">
          <h2 className="text-lg font-bold text-gray-950">Order Summary</h2>

          {/* Items List */}
          <div className="max-h-60 overflow-y-auto space-y-3 pr-1">
            {cartItems.map((item) => (
              <div key={item.id} className="flex items-center gap-3">
                <img src={item.image} alt={item.name} className="h-12 w-12 rounded-lg object-cover bg-white border border-gray-200 shrink-0" />
                <div className="flex-1 min-w-0 text-xs">
                  <p className="font-bold text-gray-950 truncate">{item.name}</p>
                  <p className="text-gray-500">Size: {item.size} · Color: {item.color} · Qty: {item.quantity}</p>
                </div>
                <span className="font-bold text-xs text-gray-950">{formatPrice(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>

          {/* Pricing Breakdown */}
          <div className="space-y-3 border-t border-gray-200 pt-4 text-xs font-semibold text-gray-600">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatPrice(preview?.subtotal ?? cartSubtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span>Shipping Fee</span>
              <span>{isCalculating ? "Calculating..." : formatPrice(preview?.shippingAmount ?? (cartSubtotal >= 5000 ? 0 : 250))}</span>
            </div>
            {preview && preview.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Discount</span>
                <span>-{formatPrice(preview.discountAmount)}</span>
              </div>
            )}
            <div className="border-t border-gray-200 pt-3 text-sm font-extrabold text-gray-950 flex justify-between">
              <span>Total</span>
              <span className="text-base text-gray-950">
                {formatPrice(preview?.total ?? (cartSubtotal + (cartSubtotal >= 5000 ? 0 : 250)))}
              </span>
            </div>
          </div>

          {/* Place Order CTA Button */}
          <button
            type="button"
            onClick={handlePlaceOrder}
            disabled={isSubmitting || !selectedAddressId || addresses.length === 0}
            className="w-full rounded-xl bg-black py-4 text-sm font-bold text-white hover:bg-gray-800 transition disabled:bg-gray-300 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSubmitting ? "Placing Order..." : `Place Order · ${formatPrice(preview?.total ?? (cartSubtotal + (cartSubtotal >= 5000 ? 0 : 250)))}`}
          </button>
        </aside>
      </div>

      {/* Mock Online Payment Modal Simulation */}
      {pendingOrderId && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
              <CreditCardIcon className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-gray-950">Mock Payment Simulation</h3>
              <p className="mt-1.5 text-xs text-gray-500 font-medium">
                Simulate the online payment gateway response for testing.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleMockPaymentResult(true)}
                disabled={isProcessingMockPayment}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white hover:bg-emerald-700 transition disabled:opacity-50 cursor-pointer"
              >
                {isProcessingMockPayment ? (
                  "Processing..."
                ) : (
                  <>
                    <CheckIcon className="h-4 w-4" />
                    <span>Simulate Success</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleMockPaymentResult(false)}
                disabled={isProcessingMockPayment}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-red-600 py-3 text-xs font-bold text-white hover:bg-red-700 transition disabled:opacity-50 cursor-pointer"
              >
                {isProcessingMockPayment ? (
                  "Processing..."
                ) : (
                  <>
                    <CloseIcon className="h-4 w-4" />
                    <span>Simulate Failure</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default CheckoutPage;