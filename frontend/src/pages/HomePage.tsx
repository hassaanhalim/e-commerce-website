import { useState, useEffect, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import CategoryCard from "../components/product/CategoryCard";
import ProductCard from "../components/product/ProductCard";
import { categories } from "../data/categories";
import { catalogApi } from "../services/catalog-api";
import { homepageApi, type HomepageSettingsData } from "../services/homepage-api";
import type { Product } from "../types/product";
import heroImageFallback from "../assets/images/hero-collection.webp";
import salePromoImageFallback from "../assets/images/sale-promo.webp";
import menImage from "../assets/images/category-men.webp";
import womenImage from "../assets/images/category-women.webp";
import sportsImage from "../assets/images/category-sports.webp";

function renderBenefitIcon(iconKey: string) {
  switch (iconKey) {
    case "exchange":
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      );
    case "shield":
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      );
    case "support":
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      );
    case "truck":
    default:
      return (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l-1 9a2 2 0 002 2h12a2 2 0 002-2L19 8M10 12h4" />
        </svg>
      );
  }
}

const quickCategories = [
  { id: "men", name: "Men", image: menImage, link: "/shop?gender=Men" },
  { id: "women", name: "Women", image: womenImage, link: "/shop?gender=Women" },
  { id: "sports", name: "Sports", image: sportsImage, link: "/shop?category=Sports" },
  { id: "formal", name: "Formal", image: heroImageFallback, link: "/shop?category=Formal" },
  { id: "accessories", name: "Accessories", image: salePromoImageFallback, link: "/shop" },
];

export function HomePage() {
  const navigate = useNavigate();
  const [mobileSearchQuery, setMobileSearchQuery] = useState("");
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [hpSettings, setHpSettings] = useState<HomepageSettingsData | null>(() => homepageApi.getCachedSettings());

  useEffect(() => {
    let isMounted = true;
    const initialLimit = hpSettings?.arrivalsLimit || 4;

    Promise.allSettled([
      homepageApi.getPublicSettings(),
      catalogApi.getProducts({ limit: initialLimit, isFeatured: true }),
    ]).then(([settingsResult, productsResult]) => {
      if (!isMounted) return;

      let resolvedLimit = initialLimit;
      if (settingsResult.status === "fulfilled" && settingsResult.value) {
        setHpSettings(settingsResult.value);
        if (settingsResult.value.arrivalsLimit) {
          resolvedLimit = settingsResult.value.arrivalsLimit;
        }
      }

      if (productsResult.status === "fulfilled" && productsResult.value) {
        const res = productsResult.value;
        if (res.data.length > 0) {
          setFeaturedProducts(res.data);
        } else {
          catalogApi
            .getProducts({ limit: resolvedLimit })
            .then((fallbackRes) => {
              if (isMounted) setFeaturedProducts(fallbackRes.data);
            })
            .catch(() => {});
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  function handleMobileSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const query = mobileSearchQuery.trim();
    if (!query) return;
    navigate(`/search?q=${encodeURIComponent(query)}`);
  }

  const activeStats = hpSettings?.stats ? hpSettings.stats.filter((s) => s.enabled) : null;
  const activeBenefits = hpSettings?.benefits ? hpSettings.benefits.filter((b) => b.enabled) : null;

  return (
    <main className="bg-[#FBFAF7]">
      {/* ──────────────── 1. Mobile Search Field (lg:hidden) ──────────────── */}
      <div className="px-4 pt-3.5 pb-1 lg:hidden">
        <form onSubmit={handleMobileSearch} className="w-full" role="search">
          <label htmlFor="mobileSearch" className="sr-only">Search shoes, brands, categories...</label>
          <div className="flex h-12 w-full items-center overflow-hidden rounded-2xl border border-[#E7E3DC] bg-white px-3.5 shadow-2xs transition focus-within:border-[#748779] focus-within:ring-1 focus-within:ring-[#748779]">
            <svg className="h-4.5 w-4.5 shrink-0 text-[#667085]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              id="mobileSearch"
              type="search"
              value={mobileSearchQuery}
              onChange={(e) => setMobileSearchQuery(e.target.value)}
              placeholder="Search shoes, brands, categories..."
              className="min-w-0 flex-1 bg-transparent px-3 text-xs sm:text-sm text-[#20252B] outline-none placeholder:text-[#98A2B3]"
            />
          </div>
        </form>
      </div>

      {/* ──────────────── 2. Hero Section ──────────────── */}
      {(!hpSettings || hpSettings.heroEnabled) && (
        <>
          {/* Mobile Single Hero Card (lg:hidden) */}
          <div className="px-4 py-2.5 lg:hidden">
            <div className="relative overflow-hidden rounded-[22px] min-h-[440px] sm:min-h-[480px] bg-[#1E242B] border border-[#E7E3DC]/30 shadow-sm flex flex-col justify-between p-6 sm:p-7">
              <img
                src={hpSettings?.heroImageUrl || heroImageFallback}
                alt="Shoe collection — footwear"
                loading="eager"
                decoding="async"
                fetchPriority="high"
                className="absolute inset-0 h-full w-full object-cover object-[72%_center] sm:object-[65%_center]"
              />
              {/* Smooth gradient overlay to ensure text readability on mobile */}
              <div className="absolute inset-0 bg-gradient-to-r from-[#171D22]/90 via-[#171D22]/55 to-transparent/20" />

              {/* Top Eyebrow Badge */}
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-black/30 px-3.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur-xs w-fit">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#889B8D]"></span>
                  {hpSettings?.heroEyebrow || "NEW COLLECTION 2026"}
                </div>
              </div>

              {/* Text & CTA Content */}
              <div className="relative z-10 mt-auto pt-6">
                <h1 className="text-[34px] sm:text-[40px] font-bold leading-[1.04] tracking-tight text-white max-w-[280px]">
                  Step into<br />comfort and<br />confidence.
                </h1>
                <p className="mt-3 max-w-[260px] sm:max-w-[300px] text-xs sm:text-sm leading-relaxed text-white/85">
                  {hpSettings?.heroDescription || "Footwear designed for your everyday movement, professional style and active lifestyle."}
                </p>
                <div className="mt-5">
                  <Link
                    to={hpSettings?.heroPrimaryUrl || "/shop"}
                    className="inline-flex w-[58%] sm:w-[50%] max-w-[210px] items-center justify-center rounded-xl bg-[#5E7063] py-3.5 text-xs sm:text-sm font-semibold text-white shadow-md transition duration-200 hover:bg-[#4D5E52] active:scale-98"
                  >
                    {hpSettings?.heroPrimaryLabel || "Shop All Shoes"}
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop 2-Column Hero (hidden on mobile, visible on lg:) */}
          <section className="hidden border-b border-[#E7E3DC] bg-[#F7F5F1] lg:block">
            <div className="mx-auto grid max-w-7xl items-center gap-6 px-4 py-8 sm:gap-10 sm:px-6 sm:py-12 lg:grid-cols-2 lg:py-12">
              <div className="max-w-xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#D8C7B2]/60 bg-white/80 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#748779] backdrop-blur-xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#748779]"></span>
                  {hpSettings?.heroEyebrow || "New Collection 2026"}
                </div>

                <h1 className="mt-3 text-3xl font-bold leading-[1.12] tracking-tight text-[#20252B] sm:mt-4 sm:text-4xl md:text-5xl lg:text-6xl">
                  {hpSettings?.heroHeading || "Step into comfort and confidence."}
                </h1>

                <p className="mt-3 max-w-lg text-sm leading-relaxed text-[#667085] sm:mt-4 sm:text-base md:text-lg">
                  {hpSettings?.heroDescription || "Discover footwear designed for your everyday movement, professional style and active lifestyle."}
                </p>

                <div className="mt-5 flex flex-col gap-3 sm:mt-7 sm:flex-row">
                  {hpSettings?.heroPrimaryLabel && (
                    <Link
                      to={hpSettings.heroPrimaryUrl || "/shop"}
                      className="inline-flex items-center justify-center rounded-xl bg-[#748779] px-6 py-3 text-sm font-semibold text-white shadow-xs transition hover:bg-[#5E7063] sm:px-7 sm:py-3.5"
                    >
                      {hpSettings.heroPrimaryLabel}
                    </Link>
                  )}

                  {hpSettings?.heroSecondaryLabel && (
                    <Link
                      to={hpSettings.heroSecondaryUrl || "/shop?category=Sports"}
                      className="inline-flex items-center justify-center rounded-xl border border-[#E7E3DC] bg-white px-6 py-3 text-sm font-semibold text-[#20252B] transition hover:border-[#748779] hover:bg-[#FBFAF7] sm:px-7 sm:py-3.5"
                    >
                      {hpSettings.heroSecondaryLabel}
                    </Link>
                  )}
                </div>

                {/* Trust Stats */}
                <div className="mt-6 grid grid-cols-3 gap-3 border-t border-[#E7E3DC] pt-5 sm:mt-8 sm:gap-4 sm:pt-6">
                  {(activeStats || [
                    { value: "100%", label: "Quality checked" },
                    { value: "7 Days", label: "Exchange policy" },
                    { value: "PKR 5K", label: "Free shipping" },
                  ]).slice(0, 3).map((st, idx) => (
                    <div key={idx} className={idx > 0 ? "border-l border-[#E7E3DC] pl-3 sm:pl-4" : ""}>
                      <p className="text-lg font-bold text-[#20252B] sm:text-xl">{st.value}</p>
                      <p className="mt-0.5 text-[11px] text-[#667085] sm:text-xs">{st.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="w-full self-center overflow-hidden rounded-2xl border border-[#E7E3DC] bg-[#E8DED1]/30 shadow-2xs aspect-[4/3] max-h-[360px] sm:max-h-[400px] lg:max-h-[430px]">
                <img
                  src={hpSettings?.heroImageUrl || heroImageFallback}
                  alt="Shoe collection — footwear"
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                  width={600}
                  height={450}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </section>
        </>
      )}

      {/* ──────────────── 3. Mobile Trust / Benefit Strip (lg:hidden) ──────────────── */}
      <div className="px-4 py-1.5 lg:hidden">
        <div className="rounded-2xl border border-[#E7E3DC] bg-white p-3.5 shadow-2xs">
          <div className="grid grid-cols-3 divide-x divide-[#E7E3DC] text-center">
            <div className="flex flex-col items-center px-1">
              <div className="flex items-center gap-1 text-[#748779] mb-0.5">
                <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="text-xs sm:text-sm font-bold text-[#20252B]">100%</span>
              </div>
              <span className="text-[10px] sm:text-[11px] text-[#667085] leading-tight">Quality checked</span>
            </div>

            <div className="flex flex-col items-center px-1">
              <div className="flex items-center gap-1 text-[#748779] mb-0.5">
                <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                <span className="text-xs sm:text-sm font-bold text-[#20252B]">7 Days</span>
              </div>
              <span className="text-[10px] sm:text-[11px] text-[#667085] leading-tight">Exchange policy</span>
            </div>

            <div className="flex flex-col items-center px-1">
              <div className="flex items-center gap-1 text-[#748779] mb-0.5">
                <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l-1 9a2 2 0 002 2h12a2 2 0 002-2L19 8M10 12h4" />
                </svg>
                <span className="text-xs sm:text-sm font-bold text-[#20252B]">PKR 5K+</span>
              </div>
              <span className="text-[10px] sm:text-[11px] text-[#667085] leading-tight">Free shipping</span>
            </div>
          </div>
        </div>
      </div>

      {/* ──────────────── 4. Mobile Quick Categories (lg:hidden) ──────────────── */}
      <section className="px-4 py-3 lg:hidden">
        <div className="flex items-center justify-between gap-3 overflow-x-auto no-scrollbar py-1">
          {quickCategories.map((cat) => (
            <Link
              key={cat.id}
              to={cat.link}
              className="flex flex-col items-center shrink-0 group cursor-pointer"
            >
              <div className="h-15 w-15 sm:h-16 sm:w-16 rounded-full border border-[#E7E3DC] p-0.5 overflow-hidden bg-[#F7F5F1] shadow-2xs transition-transform duration-200 group-hover:scale-105 active:scale-95">
                <img
                  src={cat.image}
                  alt={cat.name}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover rounded-full"
                />
              </div>
              <span className="mt-1.5 text-xs font-semibold text-[#20252B] transition-colors group-hover:text-[#748779]">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ──────────────── 5. Desktop Categories Section (hidden on mobile, visible on lg:) ──────────────── */}
      {(!hpSettings || hpSettings.categoriesEnabled) && (
        <section className="hidden mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:block">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#748779]">
                {hpSettings?.categoriesEyebrow || "Shop by category"}
              </p>
              <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-[#20252B] sm:text-3xl md:text-4xl">
                {hpSettings?.categoriesHeading || "Find your perfect pair"}
              </h2>
              {hpSettings?.categoriesDescription && (
                <p className="mt-1 text-sm text-[#667085]">{hpSettings.categoriesDescription}</p>
              )}
            </div>

            <Link
              to={hpSettings?.categoriesCtaUrl || "/shop"}
              className="group inline-flex items-center gap-1 text-sm font-semibold text-[#748779] transition hover:text-[#5E7063]"
            >
              {hpSettings?.categoriesCtaLabel || "View all products"}
              <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>

          <div className="mt-5 grid gap-4 sm:mt-7 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
            {categories.map((category) => (
              <CategoryCard
                key={category.id}
                category={category}
              />
            ))}
          </div>
        </section>
      )}

      {/* ──────────────── 6. Featured / New Arrivals Section ──────────────── */}
      {(!hpSettings || hpSettings.arrivalsEnabled) && (
        <section className="border-y border-[#E7E3DC] bg-[#F7F5F1] py-6 sm:py-10 lg:py-14">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="hidden lg:block text-xs font-bold uppercase tracking-[0.15em] text-[#748779]">
                  {hpSettings?.arrivalsEyebrow || "Latest footwear"}
                </p>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-[#20252B]">
                  {hpSettings?.arrivalsHeading || "New Arrivals"}
                </h2>
                <p className="hidden lg:block mt-1 text-sm text-[#667085]">
                  {hpSettings?.arrivalsDescription || "Explore our newest styles and designs."}
                </p>
              </div>

              <Link
                to={hpSettings?.arrivalsCtaUrl || "/shop"}
                className="group inline-flex items-center gap-1 text-xs sm:text-sm font-semibold text-[#748779] transition hover:text-[#5E7063]"
              >
                {hpSettings?.arrivalsCtaLabel || "View all"}
                <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>

            {/* 2-Column Grid on Mobile, 4-Column on Desktop */}
            <div className="mt-4 sm:mt-6 grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4 lg:gap-5">
              {featuredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ──────────────── 7. Promotional / Sale Banner Section ──────────────── */}
      {(!hpSettings || hpSettings.promoEnabled) && (
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-14">
          <div className="grid overflow-hidden rounded-2xl border border-[#E7E3DC] bg-gradient-to-br from-[#F7F5F1] via-[#FBFAF7] to-[#E8DED1]/50 text-[#20252B] shadow-2xs sm:rounded-3xl lg:grid-cols-2">
            <div className="flex flex-col justify-center p-6 sm:p-12 lg:p-14">
              <div className="w-fit rounded-full bg-[#E5EAE6] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#748779]">
                {hpSettings?.promoEyebrow || "Selected styles"}
              </div>

              <h2 className="mt-4 text-2xl font-bold tracking-tight text-[#20252B] sm:text-3xl md:text-4xl">
                {hpSettings?.promoHeading || "Save on our best sellers"}
              </h2>

              <p className="mt-3 max-w-lg text-sm leading-relaxed text-[#667085] sm:text-base">
                {hpSettings?.promoDescription || "Shop selected everyday, formal and sports footwear at reduced prices while stock lasts."}
              </p>

              <Link
                to={hpSettings?.promoCtaUrl || "/shop"}
                className="mt-5 inline-flex w-fit rounded-xl bg-[#748779] px-6 py-3 text-sm font-semibold text-white shadow-xs transition hover:bg-[#5E7063] sm:mt-7 sm:px-7 sm:py-3.5"
              >
                {hpSettings?.promoCtaLabel || "Shop Sale Collection"}
              </Link>
            </div>

            <div className="min-h-48 overflow-hidden border-t border-[#E7E3DC] sm:min-h-64 lg:min-h-80 lg:border-l lg:border-t-0">
              <img
                src={hpSettings?.promoImageUrl || salePromoImageFallback}
                alt="Seasonal shoe sale — curated collection"
                loading="lazy"
                decoding="async"
                width={600}
                height={400}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        </section>
      )}

      {/* ──────────────── 8. Benefits Section ──────────────── */}
      <section className="border-y border-[#E7E3DC] bg-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:gap-8 sm:px-6 sm:py-12 md:grid-cols-2 lg:grid-cols-4">
          {(activeBenefits || [
            { title: "Reliable Delivery", description: "Secure delivery throughout supported areas in Pakistan.", iconKey: "truck" },
            { title: "Easy Size Exchange", description: "Request a size exchange according to our exchange policy.", iconKey: "exchange" },
            { title: "100% Quality Checked", description: "All footwear is quality checked before dispatch to guarantee standard.", iconKey: "shield" },
            { title: "Customer Support", description: "Contact our team for product and order assistance.", iconKey: "support" },
          ]).map((bn, idx) => (
            <div key={idx} className="flex items-start gap-4">
              <div className="shrink-0 rounded-xl border border-[#E7E3DC] bg-[#F7F5F1] p-3 text-[#748779]">
                {renderBenefitIcon(bn.iconKey)}
              </div>
              <div>
                <h3 className="font-semibold text-[#20252B]">{bn.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-[#667085]">{bn.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ──────────────── 9. Newsletter Section ──────────────── */}
      {(!hpSettings || hpSettings.newsletterEnabled) && (
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-14">
          <div className="rounded-2xl border border-[#E7E3DC] bg-[#F7F5F1] px-5 py-8 text-center sm:rounded-3xl sm:px-10 sm:py-12">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#748779]">
              {hpSettings?.newsletterEyebrow || "Stay updated"}
            </p>

            <h2 className="mt-2 text-xl font-bold tracking-tight text-[#20252B] sm:text-3xl">
              {hpSettings?.newsletterHeading || "Get new arrivals and offers"}
            </h2>

            <p className="mx-auto mt-2 max-w-xl text-xs sm:text-sm leading-relaxed text-[#667085]">
              {hpSettings?.newsletterDescription || "Subscribe to receive information about new products, seasonal collections and store promotions."}
            </p>

            <form
              onSubmit={(event) => event.preventDefault()}
              className="mx-auto mt-4 flex max-w-xl flex-col gap-2.5 sm:mt-7 sm:flex-row"
            >
              <label htmlFor="newsletterEmail" className="sr-only">
                Email address
              </label>

              <input
                id="newsletterEmail"
                type="email"
                placeholder={hpSettings?.newsletterPlaceholder || "Enter your email address"}
                className="min-w-0 flex-1 rounded-xl border border-[#E7E3DC] bg-white px-4 py-3 text-xs sm:text-sm text-[#20252B] outline-none transition focus:border-[#748779] focus:ring-1 focus:ring-[#748779] placeholder:text-[#667085]"
              />

              <button
                type="submit"
                className="rounded-xl bg-[#748779] px-7 py-3 text-xs sm:text-sm font-semibold text-white shadow-xs transition hover:bg-[#5E7063]"
              >
                {hpSettings?.newsletterButtonLabel || "Subscribe"}
              </button>
            </form>
          </div>
        </section>
      )}
    </main>
  );
}

export default HomePage;
