import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { useWishlist } from "../context/WishlistContext";
import { useCart } from "../context/CartContext";
import { catalogApi } from "../services/catalog-api";
import { formatPrice } from "../utils/formatPrice";
import AdminModal from "../components/admin/AdminModal";
import type { Product } from "../types/product";

export function GuestWishlistPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { wishlistItems, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();

  const [likedProducts, setLikedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState<number | null>(null);
  const [selectedColor, setSelectedColor] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    if (wishlistItems.length === 0) {
      setLikedProducts([]);
      return;
    }

    setLoading(true);
    catalogApi
      .getProducts({ limit: 50 })
      .then((res) => {
        if (isMounted) {
          const filtered = res.data.filter((p) =>
            wishlistItems.some((id) => String(id) === String(p.id) || String(id) === String(p.slug)),
          );
          setLikedProducts(filtered);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [wishlistItems]);

  if (authLoading) {
    return (
      <main className="mx-auto max-w-7xl px-5 py-20 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-black border-t-transparent"></div>
        <p className="mt-3 text-xs font-semibold text-gray-400">Loading wishlist...</p>
      </main>
    );
  }

  if (user) {
    return <Navigate to="/account/wishlist" replace />;
  }

  const handleOpenMoveModal = (prod: Product) => {
    setSelectedProduct(prod);
    setSelectedSize(prod.sizes[0] ?? null);
    setSelectedColor(prod.colors[0] ?? "");
    setError("");
  };

  const handleConfirmMoveToCart = () => {
    if (!selectedProduct) return;
    if (selectedSize === null || !selectedColor) {
      setError("Please select a size and color to add the product to your cart.");
      return;
    }

    const price = selectedProduct.salePrice !== undefined && selectedProduct.salePrice !== null ? selectedProduct.salePrice : selectedProduct.price;

    addToCart({
      productId: selectedProduct.id,
      name: selectedProduct.name,
      image: selectedProduct.image,
      price,
      size: selectedSize,
      color: selectedColor,
      stock: selectedProduct.availableQuantity ?? 0,
    });

    // Remove from wishlist
    removeFromWishlist(selectedProduct.id);
    setSelectedProduct(null);
  };

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 min-h-[calc(100vh-72px)] space-y-6 sm:space-y-8">
      {/* Banner Reminder for Logged-Out Guests */}
      {!authLoading && !user && likedProducts.length > 0 && (
        <div className="flex flex-col gap-4 rounded-2xl bg-amber-50 border border-amber-200 p-6 sm:flex-row sm:items-center sm:justify-between shadow-xs">
          <div>
            <h3 className="font-bold text-amber-900 text-base">Save Your Favorite Items Permanently</h3>
            <p className="mt-1 text-sm text-amber-700 font-medium">
              Create an account or log in to sync these items and access them from any device.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              to="/login"
              className="rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-sm font-semibold text-amber-800 hover:bg-amber-100 transition outline-none"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition outline-none"
            >
              Register
            </Link>
          </div>
        </div>
      )}

      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-[#20252B] tracking-tight sm:text-3xl">Shopping Wishlist</h1>
        <p className="mt-1 text-xs font-bold text-[#748779] uppercase tracking-wider">
          Review saved products and size options.
        </p>
      </div>

      {/* Grid of Wishlist Items */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-[#748779] border-t-transparent"></div>
          <p className="mt-3 text-xs font-semibold text-[#667085]">Loading wishlist products...</p>
        </div>
      ) : (
        <section className="grid gap-3 min-[375px]:grid-cols-2 min-[375px]:gap-4 sm:gap-6 lg:grid-cols-4">
          {likedProducts.length === 0 ? (
            <div className="col-span-full rounded-2xl border border-gray-200 bg-white p-16 text-center shadow-xs">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <h3 className="mt-4 text-xl font-bold text-gray-900">Your wishlist is currently empty</h3>
              <p className="mt-2 text-sm text-gray-500 font-medium">Browse our collections to save items you're interested in.</p>
              <Link
                to="/shop"
                className="mt-6 inline-flex rounded-xl bg-black px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800 transition outline-none cursor-pointer"
              >
                Continue Shopping
              </Link>
            </div>
          ) : (
            likedProducts.map((p) => {
              const hasDiscount = p.salePrice !== undefined && p.salePrice !== null && p.salePrice < p.price;
              return (
                <article
                  key={p.id}
                  className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm flex flex-col justify-between transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div>
                    <div className="relative overflow-hidden rounded-xl bg-gray-100 aspect-4/3">
                      <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeFromWishlist(p.id)}
                        className="absolute right-2 top-2 rounded-full bg-white/80 p-1.5 text-gray-600 hover:text-red-500 transition shadow-xs cursor-pointer"
                        title="Remove"
                      >
                        <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="mt-3">
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">{p.brand}</p>
                      <h3 className="font-bold text-gray-900 text-sm mt-1 leading-snug truncate">{p.name}</h3>

                      <div className="mt-2 flex items-center gap-2">
                        {hasDiscount ? (
                          <>
                            <span className="text-sm font-bold text-gray-900">{formatPrice(p.salePrice!)}</span>
                            <span className="text-xs text-gray-400 line-through">{formatPrice(p.price)}</span>
                          </>
                        ) : (
                          <span className="text-sm font-bold text-gray-900">{formatPrice(p.price)}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => handleOpenMoveModal(p)}
                      className="w-full rounded-xl bg-black py-2.5 text-xs font-bold text-white hover:bg-gray-800 transition cursor-pointer outline-none"
                    >
                      Move to Cart
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </section>
      )}

      {/* Move to Cart Variant Selector Dialog */}
      <AdminModal
        isOpen={selectedProduct !== null}
        onClose={() => setSelectedProduct(null)}
        title="Select Size & Color"
        onConfirm={handleConfirmMoveToCart}
        confirmText="Add to Cart"
      >
        {selectedProduct && (
          <div className="space-y-5">
            {error && <p className="text-xs font-semibold text-red-500 bg-red-50 border border-red-200 p-2.5 rounded-lg">{error}</p>}

            <div className="flex items-center gap-3">
              <img src={selectedProduct.image} alt={selectedProduct.name} className="h-14 w-14 rounded-lg object-cover border border-gray-200" />
              <div>
                <h4 className="font-bold text-gray-950 text-sm leading-snug">{selectedProduct.name}</h4>
                <p className="text-xs text-gray-400 font-semibold mt-0.5">{selectedProduct.brand}</p>
              </div>
            </div>

            {/* Size selection */}
            {selectedProduct.sizes.length > 0 && (
              <div>
                <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Select Size</h5>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedProduct.sizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => {
                        setSelectedSize(size);
                        setError("");
                      }}
                      className={`min-w-10 rounded-lg border px-3 py-2 text-xs font-semibold transition cursor-pointer ${
                        selectedSize === size
                          ? "border-black bg-black text-white"
                          : "border-gray-300 bg-white text-gray-700 hover:border-black"
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Color selection */}
            {selectedProduct.colors.length > 0 && (
              <div>
                <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Select Color</h5>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedProduct.colors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => {
                        setSelectedColor(color);
                        setError("");
                      }}
                      className={`rounded-lg border px-4 py-2 text-xs font-semibold transition cursor-pointer ${
                        selectedColor === color
                          ? "border-black bg-black text-white"
                          : "border-gray-300 bg-white text-gray-700 hover:border-black"
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </AdminModal>
    </main>
  );
}

export default GuestWishlistPage;
