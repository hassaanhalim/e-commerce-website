import { useState, useMemo, useEffect, useRef, type CSSProperties, type MouseEvent } from "react";
import { Link, useParams, useNavigate } from "react-router";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { catalogApi, type ProductDetailResponse } from "../services/catalog-api";
import { reviewApi } from "../services/review-api";
import { orderApi } from "../services/order-api";
import { formatPrice } from "../utils/formatPrice";
import ProductCard from "../components/product/ProductCard";
import type { Product } from "../types/product";
import type { PublicReview, RatingSummary } from "../types/review";

export function ProductDetailsPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
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

  // Write Review state
  const [eligibleOrderItemId, setEligibleOrderItemId] = useState<string | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [newReviewTitle, setNewReviewTitle] = useState("");
  const [newReviewComment, setNewReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState("");

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

        // Execute all secondary data requests in parallel
        Promise.allSettled([
          catSlug ? catalogApi.getProducts({ category: catSlug, limit: 5 }) : Promise.resolve(null),
          reviewApi.getRatingSummary(res.id),
          reviewApi.getProductReviews(res.id, { rating: selectedRatingFilter, page: reviewsPage, limit: 5 }),
          user ? orderApi.getCustomerOrders({ status: "DELIVERED" as any }) : Promise.resolve(null),
        ]).then(([relatedRes, summaryRes, reviewsRes, ordersRes]) => {
          if (!isMounted) return;

          if (relatedRes.status === "fulfilled" && relatedRes.value?.data) {
            setRelatedProducts(
              relatedRes.value.data.filter((p) => p.id !== res.id && p.slug !== res.slug).slice(0, 4),
            );
          }

          if (summaryRes.status === "fulfilled" && summaryRes.value) {
            setRatingSummary(summaryRes.value);
          }

          if (reviewsRes.status === "fulfilled" && reviewsRes.value) {
            setReviews(reviewsRes.value.data);
            setReviewsTotalPages(reviewsRes.value.meta.totalPages);
            setReviewsLoading(false);
          }

          if (ordersRes.status === "fulfilled" && ordersRes.value?.data) {
            let foundItemId: string | null = null;
            for (const order of ordersRes.value.data) {
              if (Array.isArray((order as any).items)) {
                const item = (order as any).items.find(
                  (i: any) => i.productId === res.id || i.product?.id === res.id,
                );
                if (item) {
                  foundItemId = item.id;
                  break;
                }
              }
            }

            if (foundItemId) {
              reviewApi
                .checkEligibility(foundItemId)
                .then((el) => {
                  if (isMounted && el.eligible) {
                    setEligibleOrderItemId(foundItemId);
                  }
                })
                .catch(() => {
                  if (isMounted) setEligibleOrderItemId(null);
                });
            } else {
              setEligibleOrderItemId(null);
            }
          }
        });
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        const msg = typeof err === "object" && err !== null && "message" in err
          ? (err as { message: string }).message
          : "We couldn't load product availability. Please try again.";
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
  const loadReviewsData = () => {
    if (!product?.id) return;
    setReviewsLoading(true);

    reviewApi
      .getRatingSummary(product.id)
      .then((summary) => {
        setRatingSummary(summary);
      })
      .catch(() => {});

    reviewApi
      .getProductReviews(product.id, {
        rating: selectedRatingFilter,
        page: reviewsPage,
        limit: 5,
      })
      .then((res) => {
        setReviews(res.data);
        setReviewsTotalPages(res.meta.totalPages);
      })
      .catch(() => {})
      .finally(() => {
        setReviewsLoading(false);
      });
  };

  // Refetch reviews when user changes review page or rating filter
  const isInitialReviewMount = useRef(true);
  useEffect(() => {
    if (isInitialReviewMount.current) {
      isInitialReviewMount.current = false;
      return;
    }
    loadReviewsData();
  }, [reviewsPage, selectedRatingFilter]);

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

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Fallback ignore
    }
  };

  const handleAddToCart = async () => {
    if (!product || !selectedVariant || !canPurchaseSelectedVariant) {
      setError("Please select a valid in-stock size and color.");
      return;
    }

    setIsSubmitting(true);
    setError("");
    setCartMessage("");

    try {
      await addToCart(
        {
          productId: product.id,
          variantId: selectedVariant.id,
          name: product.name,
          image: currentImage.url,
          price: activePrice,
          size: selectedVariant.size,
          color: selectedVariant.color,
          stock: selectedVariantAvailableQuantity,
          availableQuantity: selectedVariantAvailableQuantity,
        },
        quantity,
      );
      setCartMessage(`Added ${quantity} x ${product.name} (${selectedVariant.color}, Size ${selectedVariant.size}) to your bag!`);
      setTimeout(() => setCartMessage(""), 4000);
    } catch (err: any) {
      setError(err?.message || "Unable to update your cart. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBuyNow = async () => {
    if (!product || !selectedVariant || !canPurchaseSelectedVariant) {
      setError("Please select a valid in-stock size and color.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await addToCart(
        {
          productId: product.id,
          variantId: selectedVariant.id,
          name: product.name,
          image: currentImage.url,
          price: activePrice,
          size: selectedVariant.size,
          color: selectedVariant.color,
          stock: selectedVariantAvailableQuantity,
          availableQuantity: selectedVariantAvailableQuantity,
        },
        quantity,
      );
      navigate("/checkout");
    } catch (err: any) {
      setError(err?.message || "Unable to update your cart. Please try again.");
      setIsSubmitting(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eligibleOrderItemId) {
      setReviewError("No eligible order item found for review.");
      return;
    }
    if (!newReviewComment.trim()) {
      setReviewError("Please provide a review comment.");
      return;
    }

    setReviewSubmitting(true);
    setReviewError("");
    setReviewSuccess("");

    try {
      await reviewApi.createReview({
        orderItemId: eligibleOrderItemId,
        rating: newRating,
        title: newReviewTitle.trim() || undefined,
        comment: newReviewComment.trim(),
      });
      setReviewSuccess("Thank you! Your review has been submitted for moderation.");
      setIsReviewModalOpen(false);
      setNewReviewTitle("");
      setNewReviewComment("");
      setEligibleOrderItemId(null);
      loadReviewsData();
    } catch (err: any) {
      setReviewError(err?.message || "Your review could not be submitted. Please try again.");
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="aspect-4/3 w-full animate-pulse rounded-2xl bg-gray-200" />
            <div className="grid grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="aspect-square animate-pulse rounded-xl bg-gray-200" />
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <div className="h-4 w-1/4 animate-pulse rounded bg-gray-200" />
            <div className="h-8 w-3/4 animate-pulse rounded bg-gray-200" />
            <div className="h-6 w-1/3 animate-pulse rounded bg-gray-200" />
            <div className="h-20 animate-pulse rounded-xl bg-gray-200" />
          </div>
        </div>
      </main>
    );
  }

  if (loadError || !product) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-16 text-center sm:px-6">
        <div className="mx-auto max-w-md rounded-2xl border border-red-200 bg-red-50 p-8 space-y-4 shadow-xs">
          <div className="text-3xl">⚠️</div>
          <h2 className="text-lg font-bold text-red-900">We couldn't load product availability</h2>
          <p className="text-xs text-red-700 font-medium">{loadError || "Product details are currently unavailable."}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center rounded-xl bg-black px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-gray-800 transition cursor-pointer"
          >
            Retry Loading
          </button>
        </div>
      </main>
    );
  }

  const avgRating = ratingSummary?.averageRating ?? product.rating ?? 0;
  const reviewCount = ratingSummary?.reviewCount ?? product.reviewCount ?? 0;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 space-y-12">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="text-xs font-semibold text-[#667085]">
        <ol className="flex items-center gap-1.5 flex-wrap">
          <li>
            <Link to="/" className="hover:text-[#20252B] transition">Home</Link>
          </li>
          <li>/</li>
          <li>
            <Link to="/shop" className="hover:text-[#20252B] transition">Shop</Link>
          </li>
          {product.category && (
            <>
              <li>/</li>
              <li>
                <Link to={`/shop?category=${encodeURIComponent(product.categoryObj?.slug || product.category)}`} className="hover:text-[#20252B] transition">
                  {product.category}
                </Link>
              </li>
            </>
          )}
          <li>/</li>
          <li className="text-[#20252B] font-bold truncate max-w-xs">{product.name}</li>
        </ol>
      </nav>

      {/* Main Grid */}
      <section className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-start">
        {/* Left Column: Gallery */}
        <div className="space-y-4">
          <div
            className="relative overflow-hidden rounded-2xl border border-[#E7E3DC] bg-[#F7F5F1] aspect-4/3 cursor-crosshair group"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onClick={() => setIsLightboxOpen(true)}
          >
            <img
              src={currentImage.url}
              alt={currentImage.label}
              loading="eager"
              decoding="async"
              className="h-full w-full object-cover transition duration-300 group-hover:opacity-0"
            />
            {zoomStyle.backgroundImage && (
              <div
                className="absolute inset-0 bg-no-repeat pointer-events-none transition-opacity duration-200"
                style={zoomStyle}
              />
            )}

            {/* Badges */}
            <div className="absolute left-3 top-3 z-10 flex gap-2">
              {product.isNew && (
                <span className="rounded-full bg-[#748779] px-3 py-1 text-xs font-bold text-white shadow-2xs">
                  New
                </span>
              )}
              {product.salePrice && (
                <span className="rounded-full bg-[#B9785D] px-3 py-1 text-xs font-bold text-white shadow-2xs">
                  Sale
                </span>
              )}
            </div>

            {/* Wishlist toggle */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleWishlist(product.id);
              }}
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/85 shadow-xs backdrop-blur-xs hover:bg-white transition cursor-pointer"
              aria-label={isProductInWishlist ? "Remove from wishlist" : "Add to wishlist"}
            >
              <span className={`text-base ${isProductInWishlist ? "text-red-500" : "text-gray-500"}`}>
                {isProductInWishlist ? "❤️" : "🤍"}
              </span>
            </button>

            {/* Lightbox trigger button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsLightboxOpen(true);
              }}
              className="absolute right-3 bottom-3 z-10 rounded-xl bg-white/85 p-2 text-xs font-bold text-[#20252B] shadow-xs backdrop-blur-xs hover:bg-white transition cursor-pointer"
            >
              🔍 Expand
            </button>
          </div>

          {/* Gallery Thumbnails */}
          {gallery.length > 1 && (
            <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-none">
              {gallery.map((img, idx) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setActiveImageIndex(idx)}
                  className={`relative shrink-0 w-20 aspect-square rounded-xl overflow-hidden border-2 transition cursor-pointer ${
                    activeImageIndex === idx ? "border-[#748779] ring-1 ring-[#748779]" : "border-[#E7E3DC] hover:border-gray-400"
                  }`}
                >
                  <img
                    src={img.url}
                    alt={img.label}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Information & Selectors */}
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-2 border-b border-gray-150 pb-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-[#748779]">
                {product.brand} • {product.gender}
              </span>
              <button
                type="button"
                onClick={handleCopyLink}
                className="text-xs font-bold text-gray-500 hover:text-black transition flex items-center gap-1 cursor-pointer"
              >
                {copiedLink ? "✓ Link Copied!" : "🔗 Share"}
              </button>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#20252B]">
              {product.name}
            </h1>

            {/* Ratings summary line */}
            <div className="flex items-center gap-2 text-xs font-semibold text-[#667085] pt-1">
              <div className="flex text-amber-400">
                {"★".repeat(Math.round(avgRating))}
                {"☆".repeat(5 - Math.round(avgRating))}
              </div>
              <span className="font-bold text-gray-900">{avgRating > 0 ? avgRating.toFixed(1) : "No reviews"}</span>
              <span>•</span>
              <a href="#reviews-section" className="underline hover:text-[#20252B] transition">
                {reviewCount} {reviewCount === 1 ? "review" : "reviews"}
              </a>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3 pt-2">
              <span className="text-2xl sm:text-3xl font-extrabold text-[#20252B]">
                {formatPrice(activePrice)}
              </span>
              {product.salePrice && product.basePrice > product.salePrice && (
                <span className="text-base font-semibold text-[#667085] line-through">
                  {formatPrice(product.basePrice)}
                </span>
              )}
            </div>
          </div>

          {/* Feedback Messages */}
          {cartMessage && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-bold text-emerald-800 flex items-center justify-between shadow-2xs">
              <span>{cartMessage}</span>
              <Link to="/cart" className="underline font-extrabold ml-2">View Cart →</Link>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-bold text-red-800 shadow-2xs">
              {error}
            </div>
          )}

          {/* Color Selector */}
          {product.colors.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold uppercase tracking-wider text-gray-700">Color</span>
                <span className="font-bold text-gray-900">{selectedColor || "Select color"}</span>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {product.colors.map((color) => {
                  const available = isColorAvailable(color);
                  const isSelected = selectedColor.toLowerCase() === color.toLowerCase();
                  return (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition border cursor-pointer ${
                        isSelected
                          ? "border-black bg-black text-white shadow-xs"
                          : available
                            ? "border-gray-300 bg-white text-gray-900 hover:border-gray-500"
                            : "border-gray-200 bg-gray-50 text-gray-400 line-through opacity-60"
                      }`}
                    >
                      {color}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Size Selector */}
          {product.sizes.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold uppercase tracking-wider text-gray-700">Size (EU)</span>
                <button
                  type="button"
                  onClick={() => setIsSizeGuideOpen(true)}
                  className="font-bold text-[#748779] underline hover:text-[#5E7063] transition cursor-pointer"
                >
                  Size Guide
                </button>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {product.sizes.map((size) => {
                  const available = isSizeAvailable(size);
                  const isSelected = selectedSize === size;
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      className={`py-2.5 rounded-xl text-xs font-bold transition border text-center cursor-pointer ${
                        isSelected
                          ? "border-black bg-black text-white shadow-xs"
                          : available
                            ? "border-gray-300 bg-white text-gray-900 hover:border-gray-500"
                            : "border-gray-200 bg-gray-50 text-gray-400 line-through opacity-60"
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stock Status Indicator */}
          <div className="flex items-center gap-2 pt-1 text-xs">
            {selectedSize === null && (
              <span className="text-amber-800 font-bold bg-amber-50 border border-amber-200 px-3 py-1 rounded-lg">
                Please select a size
              </span>
            )}
            {selectedSize !== null && !selectedColor && (
              <span className="text-amber-800 font-bold bg-amber-50 border border-amber-200 px-3 py-1 rounded-lg">
                Please select a color
              </span>
            )}
            {selectedSize !== null && selectedColor && canPurchaseSelectedVariant && (
              <span className="inline-flex items-center gap-1.5 font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-lg">
                <span className="h-2 w-2 rounded-full bg-emerald-600"></span>
                {selectedVariantAvailableQuantity <= 5
                  ? `Only ${selectedVariantAvailableQuantity} left in stock!`
                  : "In Stock"}
              </span>
            )}
            {selectedSize !== null && selectedColor && !canPurchaseSelectedVariant && (
              <span className="inline-flex items-center gap-1.5 font-bold text-neutral-600 bg-neutral-100 border border-neutral-200 px-3 py-1 rounded-lg">
                <span className="h-2 w-2 rounded-full bg-neutral-400"></span>
                Out of Stock for selected size/color
              </span>
            )}
          </div>

          {/* Quantity Selector */}
          <div className="flex items-center gap-4 pt-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-700">Quantity</span>
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

          {/* Delivery Estimate */}
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 space-y-1 text-xs">
            <div className="flex items-center gap-2 font-bold text-gray-900">
              <span>🚚</span> Estimated Delivery: <span className="text-black">{deliveryDates}</span>
            </div>
            <p className="text-gray-500 font-medium">Free standard shipping on orders over PKR 5,000.</p>
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
      <section id="reviews-section" className="border-t border-gray-200 pt-8 sm:pt-12 space-y-6 sm:space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-extrabold text-gray-950 sm:text-2xl">Customer Reviews</h2>
            <p className="text-xs font-semibold text-gray-500 mt-0.5">
              Real feedback from verified purchasers.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Write a Review Button / Notice */}
            {eligibleOrderItemId ? (
              <button
                type="button"
                onClick={() => setIsReviewModalOpen(true)}
                className="rounded-xl bg-black px-4 py-2 text-xs font-bold text-white hover:bg-gray-800 transition cursor-pointer shadow-xs"
              >
                ★ Write a Review
              </button>
            ) : user ? (
              <span className="text-xs text-gray-500 font-semibold italic">
                Reviews can be submitted after receiving your order.
              </span>
            ) : (
              <Link to="/login" className="text-xs font-bold text-black underline">
                Sign in to write a review
              </Link>
            )}

            {/* Star Rating Filter */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
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
        </div>

        {/* Review Success Feedback */}
        {reviewSuccess && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800">
            {reviewSuccess}
          </div>
        )}

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

      {/* Write Review Modal */}
      {isReviewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-lg shadow-2xl relative space-y-5">
            <button
              type="button"
              onClick={() => setIsReviewModalOpen(false)}
              className="absolute right-5 top-5 text-gray-400 hover:text-black text-2xl font-light cursor-pointer"
            >
              ✕
            </button>

            <div>
              <h3 className="text-xl font-extrabold text-gray-950 tracking-tight">Write a Review</h3>
              <p className="text-xs text-gray-500 font-medium mt-1">Share your experience with {product.name}</p>
            </div>

            {reviewError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-800">
                {reviewError}
              </div>
            )}

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              {/* Star Selector */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Rating
                </label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = star <= (hoverRating || newRating);
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        aria-label={`Rate ${star} out of 5 stars`}
                        className="text-2xl transition-transform hover:scale-110 cursor-pointer focus:outline-none"
                      >
                        <span className={active ? "text-amber-400" : "text-gray-300"}>★</span>
                      </button>
                    );
                  })}
                  <span className="ml-2 text-xs font-bold text-gray-600">{hoverRating || newRating} / 5</span>
                </div>
              </div>

              {/* Review Title */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Review Title (Optional)
                </label>
                <input
                  type="text"
                  value={newReviewTitle}
                  onChange={(e) => setNewReviewTitle(e.target.value)}
                  placeholder="e.g. Extremely comfortable for daily wear!"
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-black"
                />
              </div>

              {/* Review Comment */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Your Review
                </label>
                <textarea
                  rows={4}
                  required
                  value={newReviewComment}
                  onChange={(e) => setNewReviewComment(e.target.value)}
                  placeholder="Tell other shoppers about sizing, comfort, quality and materials..."
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none focus:border-black"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(false)}
                  className="rounded-xl border border-gray-300 px-5 py-2.5 text-xs font-bold text-gray-700 hover:border-black transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  className="rounded-xl bg-black px-6 py-2.5 text-xs font-bold text-white hover:bg-gray-800 transition disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {reviewSubmitting ? "Submitting..." : "Submit Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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