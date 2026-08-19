import { Link } from "react-router";
import type { Product } from "../../types/product";
import { formatPrice } from "../../utils/formatPrice";
import { useWishlist } from "../../context/WishlistContext";

interface ProductCardProps {
  product: Product;
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      className={`h-3.5 w-3.5 ${filled ? "text-amber-400" : "text-gray-300"}`}
      fill="currentColor"
      viewBox="0 0 20 20"
      aria-hidden="true"
    >
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`Rating: ${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <StarIcon key={star} filled={star <= Math.round(rating)} />
      ))}
    </div>
  );
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

  return (
    <article className="group overflow-hidden rounded-2xl border border-[#E7E3DC] bg-white shadow-2xs transition duration-300 hover:border-[#D8C7B2] hover:shadow-sm">
      <Link to={`/products/${product.slug}`} className="block">
        <div className="relative overflow-hidden bg-[#F7F5F1]">
          <img
            src={product.image}
            alt={product.name}
            className="aspect-4/3 w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />

          {/* Wishlist toggle */}
          <button
            type="button"
            onClick={handleToggleWishlist}
            className="absolute right-3 top-3 z-10 flex h-8.5 w-8.5 cursor-pointer items-center justify-center rounded-full bg-white/85 shadow-xs backdrop-blur-xs transition hover:bg-white hover:scale-105"
            aria-label={isLiked ? "Remove from wishlist" : "Add to wishlist"}
          >
            <svg
              className={`h-4.5 w-4.5 transition ${isLiked ? "fill-[#DC2626] text-[#DC2626]" : "text-[#667085] hover:text-[#DC2626]"}`}
              fill={isLiked ? "currentColor" : "none"}
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.75}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </button>

          {/* Badges */}
          {product.isNew && (
            <span className="absolute left-3 top-3 rounded-full bg-[#748779] px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-white shadow-2xs">
              New
            </span>
          )}

          {hasDiscount && !product.isNew && (
            <span className="absolute left-3 top-3 rounded-full bg-[#B9785D] px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-white shadow-2xs">
              Sale
            </span>
          )}

          {hasDiscount && product.isNew && (
            <span className="absolute left-14 top-3 rounded-full bg-[#B9785D] px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-white shadow-2xs">
              Sale
            </span>
          )}
        </div>

        <div className="p-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-[#667085]">
            {product.brand}
          </p>

          <h2 className="mt-1 text-sm font-semibold leading-snug text-[#20252B] transition-colors group-hover:text-[#748779]">
            {product.name}
          </h2>

          <div className="mt-2 flex items-center gap-1.5">
            <StarRating rating={product.rating} />
            <span className="text-xs font-medium text-[#667085]">
              ({product.reviewCount})
            </span>
          </div>

          <div className="mt-3 flex items-baseline gap-2">
            {hasDiscount ? (
              <>
                <span className="text-base font-bold text-[#20252B]">
                  {formatPrice(product.salePrice!)}
                </span>
                <span className="text-xs font-medium text-[#667085] line-through">
                  {formatPrice(product.price)}
                </span>
              </>
            ) : (
              <span className="text-base font-bold text-[#20252B]">
                {formatPrice(product.price)}
              </span>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}

export default ProductCard;
