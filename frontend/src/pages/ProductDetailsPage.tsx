import { useState, useMemo, useEffect, type CSSProperties, type MouseEvent } from "react";
import { Link, useParams, useNavigate } from "react-router";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { catalogApi, type ProductDetailResponse } from "../services/catalog-api";
import { reviewApi } from "../services/review-api";
import { formatPrice } from "../utils/formatPrice";
import ProductCard from "../components/product/ProductCard";
import type { Product } from "../types/product";
import type { PublicReview, RatingSummary } from "../types/review";

export function ProductDetailsPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

  // Core product data state
  const [product, setProduct] = useState<ProductDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);

  // Reviews & Rating states
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [ratingSummary, setRatingSummary] = useState<RatingSummary | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsPage, setReviewsPage] = useState(1);
  const [reviewsTotalPages, setReviewsTotalPages] = useState(1);
  const [selectedRatingFilter, setSelectedRatingFilter] = useState<number | undefined>(undefined);

  // Gallery UI states
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [zoomStyle, setZoomStyle] = useState<CSSProperties>({});

  // Variant selector states
  const [selectedSize, setSelectedSize] = useState<number | null>(null);
  const [selectedColor, setSelectedColor] = useState("");
  const [quantity, setQuantity] = useState(1);

  // Modals & notifications
  const [isSizeGuideOpen, setIsSizeGuideOpen] = useState(false);
  const [isSizeGuideMen, setIsSizeGuideMen] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [cartMessage, setCartMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch product detail on route change
  useEffect(() => {
    let isMounted = true;
    if (!productId) return;

    setLoading(true);
    setLoadError("");
    setSelectedSize(null);
    setSelectedColor("");
    setQuantity(1);
    setActiveImageIndex(0);
    setCartMessage("");
    setError("");

    catalogApi
      .getProductBySlug(productId)
      .then((res) => {
        if (!isMounted) return;
        setProduct(res);

        if (Array.isArray(res.sizes) && res.sizes.length > 0) {
          const firstInStockSize = res.sizes.find((s) =>
            res.variants.some((v) => v.size === s && v.inStock && v.isActive),
          );
          setSelectedSize(firstInStockSize ?? res.sizes[0]);
        }

        if (Array.isArray(res.colors) && res.colors.length > 0) {
          const firstInStockColor = res.colors.find((c) =>
            res.variants.some((v) => v.color.toLowerCase() === c.toLowerCase() && v.inStock && v.isActive),
          );
          setSelectedColor(firstInStockColor ?? res.colors[0]);
        }

        const catSlug = res.categoryObj?.slug || res.category;
        if (catSlug) {
          catalogApi
            .getProducts({ category: catSlug, limit: 5 })
            .then((relRes) => {
              if (isMounted) {
                setRelatedProducts(relRes.data.filter((p) => p.id !== res.id && p.slug !== res.slug).slice(0, 4));
              }
            })
            .catch(() => {});
        }
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        const msg = typeof err === "object" && err !== null && "message" in err
          ? (err as { message: string }).message
          : "Product not found or unavailable.";
        setLoadError(msg);
        setProduct(null);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [productId]);

  // Load reviews & summary
  useEffect(() => {
    if (!product?.id) return;
    let isMounted = true;
    setReviewsLoading(true);

    reviewApi
      .getRatingSummary(product.id)
      .then((summary) => {
        if (isMounted) setRatingSummary(summary);
      })
      .catch(() => {});

    reviewApi
      .getProductReviews(product.id, {
        rating: selectedRatingFilter,
        page: reviewsPage,
        limit: 5,
      })
      .then((res) => {
        if (isMounted) {
          setReviews(res.data);
          setReviewsTotalPages(res.meta.totalPages);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setReviewsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [product?.id, reviewsPage, selectedRatingFilter]);

  const selectedVariant = useMemo(() => {
    if (!product || selectedSize === null || !selectedColor || !Array.isArray(product.variants)) {
      return null;
    }
    return (
      product.variants.find(
        (v) =>
          v.size === selectedSize &&
          v.color.toLowerCase() === selectedColor.toLowerCase() &&
          v.isActive,
      ) || null
    );
  }, [product, selectedSize, selectedColor]);

  const selectedVariantAvailableQuantity = selectedVariant?.availableQuantity ?? 0;
  const canPurchaseSelectedVariant = Boolean(selectedVariant) && selectedVariantAvailableQuantity > 0;

  const isSizeAvailable = (size: number) => {
    if (!product?.variants) return false;
    return product.variants.some(
      (v) => v.size === size && v.inStock && v.isActive && (!selectedColor || v.color.toLowerCase() === selectedColor.toLowerCase()),
    );
  };

  const isColorAvailable = (color: string) => {
    if (!product?.variants) return false;
    return product.variants.some(
      (v) => v.color.toLowerCase() === color.toLowerCase() && v.inStock && v.isActive && (selectedSize === null || v.size === selectedSize),
    );
  };

  const activePrice = useMemo(() => {
    if (selectedVariant && typeof selectedVariant.effectivePrice === "number") {
      return selectedVariant.effectivePrice;
    }
    return product ? (product.displayPrice ?? product.basePrice) : 0;
  }, [selectedVariant, product]);

  const gallery = useMemo(() => {
    const fallbackImage = product?.image || "https://placehold.co/600x400?text=No+Image";
    const name = product?.name || "Product";

    if (!product || !Array.isArray(product.images) || product.images.length === 0) {
      return [{ id: "fallback", url: fallbackImage, label: name }];
    }

    return product.images.map((img, idx) => ({
      id: img.id || String(idx),
      url: img.url || fallbackImage,
      label: img.altText || `${name} view ${idx + 1}`,
    }));
  }, [product]);

  const currentImage = gallery[activeImageIndex] || gallery[0];
  const isProductInWishlist = product ? isInWishlist(product.id) : false;

  const deliveryDates = useMemo(() => {
    const start = new Date();
    start.setDate(start.getDate() + 3);
    const end = new Date();
    end.setDate(end.getDate() + 5);
    const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    return `${start.toLocaleDateString("en-US", options)} - ${end.toLocaleDateString("en-US", options)}`;
  }, []);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setZoomStyle({
      backgroundImage: `url(${currentImage.url})`,
      backgroundPosition: `${x}% ${y}%`,
      backgroundSize: "250%",
    });
  };

  const handleMouseLeave = () => {
    setZoomStyle({});
  };

  const handleAddToCart = async () => {
    setError("");
    setCartMessage("");
    if (!product || !selectedVariant) {
      setError("Please select a valid size and color combination.");
      return;
    }

    if (!canPurchaseSelectedVariant) {
      setError("This size/color combination is currently out of stock.");
      return;
    }

    setIsSubmitting(true);
    try {
      await addToCart({
        productId: product.id,
        variantId: selectedVariant.id,
        name: product.name,
        price: activePrice,
        size: selectedVariant.size,
        color: selectedVariant.color,
        image: currentImage.url,
        stock: selectedVariantAvailableQuantity,
      });

      setCartMessage(`Added ${quantity} x "${product.name}" (${selectedVariant.color}, Size ${selectedVariant.size}) to cart!`);
    } catch (err: unknown) {
      const msg = typeof err === "object" && err !== null && "message" in err
        ? (err as { message: string }).message
        : "Failed to add product to cart.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBuyNow = async () => {
    await handleAddToCart();
    if (selectedVariant && canPurchaseSelectedVariant) {
      navigate("/checkout");
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: product?.name || "Shoe Store",
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-6 py-24 text-center">
        <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-black border-t-transparent" />
        <p className="mt-4 text-sm font-semibold text-gray-500">Loading product details...</p>
      </main>
    );
  }

  if (loadError || !product) {
    return (
      <main className="mx-auto max-w-md px-6 py-24 text-center">
        <h1 className="text-2xl font-bold text-gray-950">Product Not Found</h1>
        <p className="mt-2 text-sm text-gray-600">{loadError || "The requested item is unavailable."}</p>
        <Link
          to="/shop"
          className="mt-6 inline-flex rounded-xl bg-black px-6 py-3 text-sm font-bold text-white hover:bg-gray-800 transition"
        >
          Return to Shop
        </Link>
      </main>
    );
  }

  const avgRating = ratingSummary?.averageRating ?? product.rating ?? 0;
  const reviewCount = ratingSummary?.reviewCount ?? product.reviewCount ?? 0;

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 space-y-8 sm:space-y-12">
      {/* Breadcrumb */}
      <nav className="text-xs font-semibold text-gray-500 flex items-center gap-2">
        <Link to="/" className="hover:text-black transition">Home</Link>
        <span>/</span>
        <Link to="/shop" className="hover:text-black transition">Shop</Link>
        <span>/</span>
        <span className="text-gray-900 font-bold truncate">{product.name}</span>
      </nav>

      {/* Main Grid */}
      <section className="grid gap-6 lg:gap-12 lg:grid-cols-2">
        {/* Left Column: Image Gallery */}
        <div className="space-y-4">
          <div
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={() => setIsLightboxOpen(true)}
            className="relative aspect-4/3 w-full overflow-hidden rounded-3xl bg-gray-100 border border-gray-200 cursor-zoom-in"
          >
            <img
              src={currentImage.url}
              alt={currentImage.label}
              className="h-full w-full object-cover transition-opacity duration-300"
              style={Object.keys(zoomStyle).length > 0 ? { opacity: 0 } : { opacity: 1 }}
            />
            {Object.keys(zoomStyle).length > 0 && (
              <div className="absolute inset-0 pointer-events-none" style={zoomStyle} />
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleWishlist(product.id);
              }}
              className={`absolute top-4 right-4 h-11 w-11 rounded-full border border-gray-200 bg-white/90 backdrop-blur-xs flex items-center justify-center text-lg transition shadow-xs hover:scale-105 cursor-pointer ${
                isProductInWishlist ? "text-red-500" : "text-gray-400 hover:text-red-500"
              }`}
            >
              {isProductInWishlist ? "♥" : "♡"}
            </button>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2">
            {gallery.map((img, idx) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setActiveImageIndex(idx)}
                className={`h-20 w-24 rounded-2xl overflow-hidden border-2 bg-gray-50 shrink-0 transition cursor-pointer ${
                  activeImageIndex === idx ? "border-black shadow-xs" : "border-gray-200 opacity-70 hover:opacity-100"
                }`}
              >
                <img src={img.url} alt={img.label} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: Details & Actions */}
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
                {product.brandObj?.name || product.brand} · {product.categoryObj?.name || product.category}
              </span>

              <button
                type="button"
                onClick={handleShare}
                className="text-xs font-bold text-gray-500 hover:text-black transition cursor-pointer"
              >
                {copiedLink ? "✓ Link Copied" : "🔗 Share"}
              </button>
            </div>

            <h1 className="mt-1 text-2xl font-extrabold text-gray-950 sm:text-3xl">{product.name}</h1>

            {/* Rating Stars Header */}
            <div className="mt-2 flex items-center gap-2">
              <div className="flex text-amber-400 text-sm">
                {"★".repeat(Math.round(avgRating))}
                {"☆".repeat(5 - Math.round(avgRating))}
              </div>
              <span className="text-xs font-bold text-gray-700">{avgRating.toFixed(1)}</span>
              <span className="text-xs text-gray-400">({reviewCount} {reviewCount === 1 ? "review" : "reviews"})</span>
            </div>
          </div>

          {/* Pricing */}
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-extrabold text-gray-950">{formatPrice(activePrice)}</span>
            {product.salePrice && product.basePrice > activePrice && (
              <span className="text-sm font-semibold text-gray-400 line-through">
                {formatPrice(product.basePrice)}
              </span>
            )}
          </div>

          {cartMessage && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-800">
              ✓ {cartMessage}
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-semibold text-red-700">
              ⚠ {error}
            </div>
          )}

          {/* Size Selector */}
          {product.sizes.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-[#667085] uppercase tracking-wider">Select Size</span>
                <button
                  type="button"
                  onClick={() => setIsSizeGuideOpen(true)}
                  className="text-xs font-bold text-[#748779] underline hover:text-[#5E7063] transition cursor-pointer"
                >
                  Size Guide
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((size) => {
                  const available = isSizeAvailable(size);
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => {
                        setSelectedSize(size);
                        setError("");
                      }}
                      disabled={!available}
                      className={`min-w-12 h-11 rounded-xl border font-bold text-xs transition cursor-pointer ${
                        !available
                          ? "border-[#E7E3DC] bg-[#F7F5F1] text-[#667085]/40 cursor-not-allowed line-through"
                          : selectedSize === size
                          ? "border-[#748779] bg-[#748779] text-white shadow-2xs"
                          : "border-[#E7E3DC] bg-white text-[#20252B] hover:border-[#748779]"
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Color Selector */}
          {product.colors.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-bold text-[#667085] uppercase tracking-wider block">Available Colour</span>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((color) => {
                  const available = isColorAvailable(color);
                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => {
                        setSelectedColor(color);
                        setError("");
                      }}
                      disabled={!available}
                      className={`px-4 h-10 rounded-xl border font-semibold text-xs transition cursor-pointer ${
                        !available
                          ? "border-[#E7E3DC] bg-[#F7F5F1] text-[#667085]/40 cursor-not-allowed line-through"
                          : selectedColor === color
                          ? "border-[#748779] bg-[#748779] text-white shadow-2xs"
                          : "border-[#E7E3DC] bg-white text-[#20252B] hover:border-[#748779]"
                      }`}
                    >
                      {color}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity Selector */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-[#667085] uppercase tracking-wider block">Quantity</span>
            <div className="inline-flex items-center rounded-xl border border-[#E7E3DC] bg-white p-1">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1 || !canPurchaseSelectedVariant || isSubmitting}
                className="w-9 h-9 flex items-center justify-center font-bold text-[#667085] hover:bg-[#F7F5F1] rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                −
              </button>
              <span className="w-10 text-center font-bold text-sm text-[#20252B]">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(selectedVariantAvailableQuantity, q + 1))}
                disabled={quantity >= selectedVariantAvailableQuantity || !canPurchaseSelectedVariant || isSubmitting}
                className="w-9 h-9 flex items-center justify-center font-bold text-[#667085] hover:bg-[#F7F5F1] rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                +
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!canPurchaseSelectedVariant || isSubmitting}
              className="rounded-xl bg-[#748779] py-3.5 text-sm font-semibold text-white hover:bg-[#5E7063] transition shadow-xs cursor-pointer disabled:bg-[#E7E3DC] disabled:text-[#667085] disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Adding..." : "Add to Cart"}
            </button>

            <button
              type="button"
              onClick={handleBuyNow}
              disabled={!canPurchaseSelectedVariant || isSubmitting}
              className="rounded-xl bg-[#20252B] py-3.5 text-sm font-semibold text-white hover:bg-[#333A42] transition shadow-xs cursor-pointer disabled:bg-[#E7E3DC] disabled:text-[#667085] disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Processing..." : "Buy Now"}
            </button>
          </div>

          {/* Product Description */}
          {product.description && (
            <div className="border-t border-gray-200 pt-6 space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Product Description</h3>
              <p className="text-sm text-gray-600 leading-relaxed font-medium whitespace-pre-line">
                {product.description}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Customer Reviews Section */}
      <section className="border-t border-gray-200 pt-8 sm:pt-12 space-y-6 sm:space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-gray-950 sm:text-2xl">Customer Reviews</h2>
            <p className="text-xs font-semibold text-gray-500 mt-0.5">
              Real feedback from verified purchasers.
            </p>
          </div>

          {/* Star Rating Filter */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs font-semibold">
            <span className="text-gray-400 uppercase font-bold mr-1">Filter:</span>
            <button
              type="button"
              onClick={() => setSelectedRatingFilter(undefined)}
              className={`rounded-lg px-2.5 py-1.5 transition cursor-pointer ${
                selectedRatingFilter === undefined ? "bg-black text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              All
            </button>
            {[5, 4, 3, 2, 1].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setSelectedRatingFilter(star)}
                className={`rounded-lg px-2.5 py-1.5 transition cursor-pointer ${
                  selectedRatingFilter === star ? "bg-black text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {star} ★
              </button>
            ))}
          </div>
        </div>

        {/* Rating Breakdown & List */}
        <div className="grid gap-8 md:grid-cols-3">
          {/* Summary Box */}
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 space-y-4 h-fit">
            <div className="text-center space-y-1">
              <span className="text-4xl font-extrabold text-gray-950">{avgRating.toFixed(1)}</span>
              <div className="flex justify-center text-amber-400 text-lg">
                {"★".repeat(Math.round(avgRating))}
                {"☆".repeat(5 - Math.round(avgRating))}
              </div>
              <p className="text-xs text-gray-500 font-semibold">Based on {reviewCount} verified reviews</p>
            </div>

            {ratingSummary?.ratingBreakdown && (
              <div className="space-y-1.5 border-t border-gray-200 pt-4 text-xs">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = ratingSummary.ratingBreakdown[star] || 0;
                  const pct = reviewCount > 0 ? (count / reviewCount) * 100 : 0;
                  return (
                    <div key={star} className="flex items-center gap-2">
                      <span className="w-8 font-bold text-gray-600">{star} ★</span>
                      <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
                        <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-6 text-right text-gray-400 font-semibold">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Reviews List */}
          <div className="md:col-span-2 space-y-4">
            {reviewsLoading ? (
              <div className="py-12 text-center text-gray-400 text-xs font-semibold">Loading reviews...</div>
            ) : reviews.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-xs text-gray-500">
                No approved reviews yet for this product.
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((rev) => (
                  <article key={rev.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex text-amber-400 text-xs">
                          {"★".repeat(rev.rating)}
                          {"☆".repeat(5 - rev.rating)}
                        </div>
                        <span className="font-bold text-xs text-gray-950">{rev.reviewerName}</span>
                        {rev.verifiedPurchase && (
                          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800">
                            ✓ Verified Purchase
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400">{new Date(rev.createdAt).toLocaleDateString("en-PK")}</span>
                    </div>
                    {rev.title && <h4 className="text-xs font-bold text-gray-900">{rev.title}</h4>}
                    <p className="text-xs text-gray-600 font-medium leading-relaxed">{rev.comment}</p>
                  </article>
                ))}

                {/* Reviews Pagination */}
                {reviewsTotalPages > 1 && (
                  <div className="flex justify-center gap-2 pt-2">
                    <button
                      type="button"
                      disabled={reviewsPage <= 1}
                      onClick={() => setReviewsPage((p) => Math.max(1, p - 1))}
                      className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-bold hover:border-black disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <span className="flex items-center px-2 text-xs font-bold text-gray-600">
                      Page {reviewsPage} of {reviewsTotalPages}
                    </span>
                    <button
                      type="button"
                      disabled={reviewsPage >= reviewsTotalPages}
                      onClick={() => setReviewsPage((p) => Math.min(reviewsTotalPages, p + 1))}
                      className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-bold hover:border-black disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Delivery Estimate */}
      <div className="rounded-2xl border border-gray-150 bg-gray-50/70 p-4 space-y-1.5 text-xs mt-4">
        <div className="flex items-center gap-2 font-bold text-gray-900">
          <span>🚚</span> Estimated Delivery: <span className="text-black">{deliveryDates}</span>
        </div>
        <p className="text-gray-500 font-medium">Free standard shipping on orders over PKR 5,000.</p>
      </div>

      {/* Lightbox Modal */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col justify-between p-6">
          <div className="flex justify-between items-center">
            <span className="text-white text-xs font-bold uppercase tracking-wider">
              {currentImage.label} ({activeImageIndex + 1}/{gallery.length})
            </span>
            <button
              type="button"
              onClick={() => setIsLightboxOpen(false)}
              className="text-white text-3xl font-light hover:text-gray-400 transition cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="flex items-center justify-between flex-1 max-w-5xl mx-auto w-full gap-4">
            <button
              type="button"
              onClick={() => setActiveImageIndex((idx) => (idx === 0 ? gallery.length - 1 : idx - 1))}
              className="text-white text-4xl p-4 hover:text-gray-400 transition cursor-pointer"
            >
              ‹
            </button>
            <div className="max-h-[70vh] flex items-center justify-center">
              <img src={currentImage.url} alt={product.name} className="max-h-[70vh] max-w-full rounded-2xl object-contain" />
            </div>
            <button
              type="button"
              onClick={() => setActiveImageIndex((idx) => (idx === gallery.length - 1 ? 0 : idx + 1))}
              className="text-white text-4xl p-4 hover:text-gray-400 transition cursor-pointer"
            >
              ›
            </button>
          </div>
        </div>
      )}

      {/* Size Guide Modal */}
      {isSizeGuideOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl relative space-y-4">
            <button
              type="button"
              onClick={() => setIsSizeGuideOpen(false)}
              className="absolute right-5 top-5 text-gray-400 hover:text-black text-2xl font-light cursor-pointer"
            >
              ✕
            </button>
            <h3 className="text-xl font-extrabold text-gray-950 tracking-tight">Sizing Guide</h3>
            <p className="text-xs text-gray-500 font-medium">Verify standard international conversions below.</p>
            <div className="flex border-b border-gray-100">
              <button
                type="button"
                onClick={() => setIsSizeGuideMen(true)}
                className={`flex-1 pb-2 text-xs font-bold border-b-2 transition cursor-pointer ${
                  isSizeGuideMen ? "border-black text-black" : "border-transparent text-gray-400"
                }`}
              >
                Men's Sizing
              </button>
              <button
                type="button"
                onClick={() => setIsSizeGuideMen(false)}
                className={`flex-1 pb-2 text-xs font-bold border-b-2 transition cursor-pointer ${
                  !isSizeGuideMen ? "border-black text-black" : "border-transparent text-gray-400"
                }`}
              >
                Women's Sizing
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Related Products Grid */}
      {relatedProducts.length > 0 && (
        <section className="border-t border-gray-200 pt-8 sm:pt-12 space-y-4 sm:space-y-6">
          <h2 className="text-xl font-bold text-gray-950 sm:text-2xl">You Might Also Like</h2>
          <div className="grid gap-3 min-[375px]:grid-cols-2 min-[375px]:gap-4 sm:gap-5 md:grid-cols-4">
            {relatedProducts.map((relProd) => (
              <ProductCard key={relProd.id} product={relProd} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

export default ProductDetailsPage;