import { useState } from "react";
import { Link } from "react-router";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { formatPrice } from "../utils/formatPrice";

function CartPage() {
  const { user } = useAuth();
  const {
    cartItems,
    cartCount,
    cartSubtotal,
    backendCart,
    isLoadingCart,
    updateQuantity,
    removeFromCart,
    clearCart,
  } = useCart();

  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [clearingCart, setClearingCart] = useState(false);

  const handleUpdateQuantity = async (itemId: string, newQty: number) => {
    setUpdatingId(itemId);
    try {
      await updateQuantity(itemId, newQty);
    } catch {
      // silently ignore
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemove = async (itemId: string) => {
    setRemovingId(itemId);
    try {
      await removeFromCart(itemId);
    } catch {
      // silently ignore
    } finally {
      setRemovingId(null);
    }
  };

  const handleClear = async () => {
    setClearingCart(true);
    try {
      await clearCart();
    } catch {
      // silently ignore
    } finally {
      setClearingCart(false);
    }
  };

  if (isLoadingCart && user) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-24 text-center">
        <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-black border-t-transparent" />
        <p className="mt-4 text-sm font-semibold text-gray-500">Loading your cart...</p>
      </main>
    );
  }

  if (cartItems.length === 0) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-24">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl border border-[#E7E3DC] bg-[#F7F5F1]">
            <svg className="h-10 w-10 text-[#748779]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <h1 className="mt-6 text-2xl font-bold text-[#20252B]">Your cart is empty</h1>
          <p className="mt-2 text-sm text-[#667085]">Browse our collection and add your favourite shoes.</p>
          <Link
            to="/shop"
            className="mt-7 inline-flex rounded-xl bg-[#748779] px-6 py-3 font-semibold text-white shadow-xs transition hover:bg-[#5E7063]"
          >
            Continue Shopping
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-5 py-10 sm:px-6">
      <div className="flex items-end justify-between border-b border-[#E7E3DC] pb-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#748779]">Shopping cart</p>
          <h1 className="mt-1.5 text-3xl font-bold text-[#20252B]">Your Cart</h1>
          <p className="mt-1 text-xs text-[#667085]">
            {cartCount} {cartCount === 1 ? "item" : "items"}
          </p>
        </div>

        <button
          type="button"
          onClick={handleClear}
          disabled={clearingCart}
          className="text-xs font-semibold text-[#B9785D] transition hover:text-[#A0644B] disabled:opacity-50 cursor-pointer"
        >
          {clearingCart ? "Clearing..." : "Clear cart"}
        </button>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <section className="space-y-4">
          {cartItems.map((item) => {
            const backendItem = backendCart?.items.find((bi) => bi.itemId === item.id);
            const availableQty = backendItem?.availableQuantity ?? item.stock;
            const warning = backendItem?.availabilityWarning;
            const isUpdating = updatingId === item.id;
            const isRemoving = removingId === item.id;

            return (
              <article
                key={item.id}
                className={`flex flex-col gap-5 rounded-2xl border bg-white p-4 shadow-2xs sm:flex-row ${
                  warning ? "border-amber-300" : "border-[#E7E3DC]"
                }`}
              >
                <Link
                  to={`/products/${backendItem?.productSlug ?? item.productId}`}
                  className="shrink-0 overflow-hidden rounded-xl bg-[#F7F5F1] sm:h-40 sm:w-44"
                >
                  <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                </Link>

                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <Link
                          to={`/products/${backendItem?.productSlug ?? item.productId}`}
                          className="font-semibold text-[#20252B] transition hover:text-[#748779]"
                        >
                          {item.name}
                        </Link>
                        <p className="mt-1 text-xs text-[#667085]">Size: {item.size}</p>
                        <p className="mt-0.5 text-xs text-[#667085]">Colour: {item.color}</p>
                        {user && backendItem?.sku && (
                          <p className="mt-0.5 text-[11px] text-[#667085]/70 font-mono">SKU: {backendItem.sku}</p>
                        )}
                      </div>
                      <p className="shrink-0 font-bold text-[#20252B]">
                        {formatPrice(item.price * item.quantity)}
                      </p>
                    </div>

                    {warning && (
                      <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs font-semibold text-amber-800">
                        ⚠ {warning}
                      </div>
                    )}
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center overflow-hidden rounded-xl border border-[#E7E3DC] bg-white">
                      <button
                        type="button"
                        aria-label={`Decrease quantity of ${item.name}`}
                        disabled={item.quantity <= 1 || isUpdating || isRemoving}
                        onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                        className="h-9 w-9 text-base transition hover:bg-[#F7F5F1] disabled:cursor-not-allowed disabled:text-[#667085]/40 cursor-pointer"
                      >
                        −
                      </button>
                      <span className="flex h-9 min-w-10 items-center justify-center border-x border-[#E7E3DC] px-2 text-xs font-bold text-[#20252B]">
                        {isUpdating ? "..." : item.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label={`Increase quantity of ${item.name}`}
                        disabled={item.quantity >= availableQty || isUpdating || isRemoving}
                        onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                        className="h-9 w-9 text-base transition hover:bg-[#F7F5F1] disabled:cursor-not-allowed disabled:text-[#667085]/40 cursor-pointer"
                      >
                        +
                      </button>
                    </div>

                    {user && availableQty > 0 && (
                      <p className="text-xs text-[#667085] font-medium">
                        {availableQty} available
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={() => handleRemove(item.id)}
                      disabled={isRemoving}
                      className="text-xs font-semibold text-[#B9785D] transition hover:text-[#A0644B] disabled:opacity-50 cursor-pointer"
                    >
                      {isRemoving ? "Removing..." : "Remove"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        <aside className="h-fit rounded-2xl border border-[#E7E3DC] bg-[#F7F5F1] p-6 shadow-2xs lg:sticky lg:top-24">
          <h2 className="text-lg font-bold text-[#20252B]">Order Summary</h2>

          <div className="mt-5 space-y-3.5">
            <div className="flex justify-between text-xs text-[#667085]">
              <span>Subtotal</span>
              <span className="font-semibold text-[#20252B]">{formatPrice(cartSubtotal)}</span>
            </div>
            <div className="flex justify-between text-xs text-[#667085]">
              <span>Shipping</span>
              <span>Calculated at checkout</span>
            </div>
            <div className="border-t border-[#E7E3DC] pt-3.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#20252B]">Total</span>
                <span className="text-xl font-bold text-[#20252B]">{formatPrice(cartSubtotal)}</span>
              </div>
            </div>
          </div>

          {user ? (
            <Link
              to="/checkout"
              className="mt-6 flex w-full items-center justify-center rounded-xl bg-[#748779] px-6 py-3.5 font-semibold text-white shadow-xs transition hover:bg-[#5E7063]"
            >
              Proceed to Checkout
            </Link>
          ) : (
            <div className="mt-6 space-y-3">
              <Link
                to="/login"
                className="flex w-full items-center justify-center rounded-xl bg-[#748779] px-6 py-3.5 font-semibold text-white shadow-xs transition hover:bg-[#5E7063]"
              >
                Sign In to Checkout
              </Link>
              <p className="text-center text-xs text-[#667085]">
                Or continue as guest –{" "}
                <Link to="/checkout" className="underline text-[#748779] hover:text-[#5E7063]">
                  Checkout
                </Link>
              </p>
            </div>
          )}

          <Link
            to="/shop"
            className="mt-3 flex w-full items-center justify-center rounded-xl border border-[#E7E3DC] bg-white px-6 py-3.5 text-sm font-semibold text-[#20252B] transition hover:border-[#748779]"
          >
            Continue Shopping
          </Link>
        </aside>
      </div>
    </main>
  );
}

export default CartPage;
