import { Link } from "react-router";
import type { Product } from "../../types/product";
import { formatPrice } from "../../utils/formatPrice";
import { useWishlist } from "../../context/WishlistContext";
import { catalogApi } from "../../services/catalog-api";

interface ProductCardProps {
  product: Product;
}



function ProductCard({ product }: ProductCardProps) {
  const { isInWishlist, toggleWishlist } = useWishlist();

  const hasDiscount =
    product.salePrice !== undefined && product.salePrice !== null && product.salePrice < product.price;

  const isLiked = isInWishlist(product.id);

  function handleToggleWishlist(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.id);
  }

  function handlePrefetch() {
    if (product.slug) {
      catalogApi.prefetchProduct(product.slug);
    }
  }

  return (
    <article
      onMouseEnter={handlePrefetch}
      onFocus={handlePrefetch}
      className="group overflow-hidden rounded-2xl border border-[#E7E3DC] bg-white shadow-2xs transition duration-300 hover:border-[#D8C7B2] hover:shadow-sm"
    >
      <Link to={`/products/${product.slug}`} className="block h-full">
        <div className="relative overflow-hidden bg-[#F7F5F1] aspect-[4/3] w-full flex items-center justify-center">
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />

          {/* Wishlist toggle */}
          <button
            type="button"
            onClick={handleToggleWishlist}
            className="absolute right-2.5 top-2.5 z-10 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-white/80 text-[#667085] shadow-xs backdrop-blur-xs transition hover:bg-white hover:scale-105 active:scale-95"
            aria-label={isLiked ? "Remove from wishlist" : "Add to wishlist"}
          >
            <svg
              className={`h-4.5 w-4.5 transition ${isLiked ? "fill-[#DC2626] text-[#DC2626]" : "text-[#20252B] stroke-[1.75]"}`}
              fill={isLiked ? "currentColor" : "none"}
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </button>
        </div>

        <div className="p-3 sm:p-4 flex flex-col justify-between">
          <div>
            <h3 className="text-xs sm:text-sm font-bold leading-snug text-[#20252B] transition-colors group-hover:text-[#748779] truncate">
              {product.name}
            </h3>

            <p className="mt-0.5 text-[11px] sm:text-xs text-[#667085] truncate">
              {product.gender ? `${product.gender}'s ` : ""}{product.category || "Footwear"}
            </p>
          </div>

          <div className="mt-2.5 flex items-center justify-between gap-1.5 flex-wrap">
            <div className="flex flex-wrap items-baseline gap-1.5">
              {hasDiscount ? (
                <>
                  <span className="text-xs sm:text-sm font-bold text-[#20252B]">
                    {formatPrice(product.salePrice!)}
                  </span>
                  <span className="text-[10px] sm:text-xs font-medium text-[#667085] line-through">
                    {formatPrice(product.price)}
                  </span>
                </>
              ) : (
                <span className="text-xs sm:text-sm font-bold text-[#20252B]">
                  {formatPrice(product.price)}
                </span>
              )}
            </div>

            {/* Badges */}
            {product.isNew && (
              <span className="rounded-md bg-[#748779] px-2 py-0.5 text-[10px] font-semibold text-white shadow-2xs">
                New
              </span>
            )}

            {hasDiscount && !product.isNew && (
              <span className="rounded-md bg-[#B9785D] px-2 py-0.5 text-[10px] font-semibold text-white shadow-2xs">
                Sale
              </span>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}

export default ProductCard;
