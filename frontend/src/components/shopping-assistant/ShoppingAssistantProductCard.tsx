import { Link } from "react-router";
import type { RecommendedProductDto } from "./types";
import { formatPrice } from "../../utils/formatPrice";

interface ShoppingAssistantProductCardProps {
  product: RecommendedProductDto;
}

export function ShoppingAssistantProductCard({ product }: ShoppingAssistantProductCardProps) {
  const displayPrice = product.displayPrice || product.price;
  const hasDiscount = product.salePrice !== null && product.salePrice !== undefined && product.salePrice < product.price;

  return (
    <div className="group relative flex items-center gap-3 overflow-hidden rounded-xl border border-[#E7E3DC] bg-white p-2.5 shadow-2xs transition hover:border-[#748779] hover:shadow-xs">
      {/* Product Image */}
      <Link
        to={`/products/${product.slug}`}
        className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#E7E3DC] bg-[#F7F5F1]"
      >
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] text-[#98A2B3]">
            No image
          </div>
        )}
      </Link>

      {/* Product Information */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#667085]">
            {product.brand}
          </span>
          <span className="inline-flex items-center rounded-full bg-[#F4F6F4] px-1.5 py-0.5 text-[9px] font-medium text-[#5E7063]">
            In Stock
          </span>
        </div>

        <Link
          to={`/products/${product.slug}`}
          title={product.name}
          className="block truncate text-xs font-bold text-[#20252B] transition hover:text-[#748779]"
        >
          {product.name}
        </Link>

        {/* Pricing */}
        <div className="mt-0.5 flex items-baseline gap-1.5">
          <span className="text-xs font-bold text-[#20252B]">
            {formatPrice(displayPrice)}
          </span>
          {hasDiscount && (
            <span className="text-[10px] text-[#98A2B3] line-through">
              {formatPrice(product.price)}
            </span>
          )}
        </div>

        {/* Matching details & Action */}
        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1">
            {product.matchingSizes && product.matchingSizes.length > 0 ? (
              <span className="rounded bg-[#E5EAE6] px-1.5 py-0.5 text-[9px] font-semibold text-[#353F38]">
                Size {product.matchingSizes.join(", ")}
              </span>
            ) : product.availableSizes && product.availableSizes.length > 0 ? (
              <span className="text-[9px] text-[#667085]">
                Sizes: {product.availableSizes.slice(0, 3).join(", ")}
                {product.availableSizes.length > 3 ? "…" : ""}
              </span>
            ) : null}

            {product.matchingColors && product.matchingColors.length > 0 && (
              <span className="rounded bg-[#F7F5F1] px-1 py-0.5 text-[9px] font-medium text-[#667085] capitalize">
                {product.matchingColors[0]}
              </span>
            )}
          </div>

          <Link
            to={`/products/${product.slug}`}
            className="shrink-0 text-[11px] font-bold text-[#748779] hover:underline"
          >
            View →
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ShoppingAssistantProductCard;
