import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useWishlist } from "../../context/WishlistContext";
import { useCart } from "../../context/CartContext";
import { catalogApi } from "../../services/catalog-api";
import { formatPrice } from "../../utils/formatPrice";
import AdminModal from "../../components/admin/AdminModal";
import type { Product } from "../../types/product";

export function AccountWishlist() {
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
      stock: 99,
    });

    // Remove from wishlist
    removeFromWishlist(selectedProduct.id);
    setSelectedProduct(null);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Wishlist</h1>
        <p className="mt-1 text-sm text-gray-500 font-medium">
          Review items you've saved for later, or move them directly to your shopping cart.
        </p>
      </div>

      {/* Grid of Wishlist Items */}
      {loading ? (
        <div className="py-12 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-black border-t-transparent"></div>
          <p className="mt-3 text-xs font-semibold text-gray-400">Loading wishlist items...</p>
        </div>
      ) : (
        <section className="grid gap-6 sm:grid-cols-2">
          {likedProducts.length === 0 ? (
            <div className="sm:col-span-2 rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <h3 className="mt-4 text-lg font-bold text-gray-900">Your wishlist is empty</h3>
              <p className="mt-2 text-sm text-gray-500 font-medium">Explore our catalog and save your favorite shoes for later.</p>
              <Link
                to="/shop"
                className="mt-6 inline-flex rounded-xl bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition outline-none cursor-pointer"
              >
                Shop Now
              </Link>
            </div>
          ) : (
            likedProducts.map((p) => {
              const hasDiscount = p.salePrice !== undefined && p.salePrice !== null && p.salePrice < p.price;
              return (
                <article
                  key={p.id}
                  className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm flex flex-col justify-between transition hover:shadow-md"
                >
                  <div className="flex gap-4">
                    <img src={p.image} alt={p.name} className="h-20 w-20 rounded-xl object-cover border border-gray-200 shrink-0" />
                    <div>
                      <h3 className="font-bold text-gray-900 text-sm leading-snug">{p.name}</h3>
                      <p className="text-xs text-gray-400 font-semibold mt-0.5">{p.brand} · {p.category}</p>

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

                  <div className="mt-5 flex gap-3 border-t border-gray-100 pt-4">
                    <button
                      type="button"
                      onClick={() => handleOpenMoveModal(p)}
                      className="flex-1 rounded-xl bg-black py-2.5 text-xs font-bold text-white hover:bg-gray-800 transition cursor-pointer outline-none"
                    >
                      Move to Cart
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFromWishlist(p.id)}
                      className="rounded-xl border border-gray-300 px-3 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 hover:border-red-300 transition cursor-pointer outline-none"
                      title="Remove from wishlist"
                    >
                      Remove
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
    </div>
  );
}

export default AccountWishlist;
