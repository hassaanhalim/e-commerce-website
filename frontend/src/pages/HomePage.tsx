import { useState, useEffect } from "react";
import { Link } from "react-router";
import CategoryCard from "../components/product/CategoryCard";
import ProductCard from "../components/product/ProductCard";
import { categories } from "../data/categories";
import { catalogApi } from "../services/catalog-api";
import { homepageApi, type HomepageSettingsData } from "../services/homepage-api";
import type { Product } from "../types/product";
import heroImageFallback from "../assets/images/hero-collection.webp";
import salePromoImageFallback from "../assets/images/sale-promo.webp";

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

export function HomePage() {
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

  const activeStats = hpSettings?.stats ? hpSettings.stats.filter((s) => s.enabled) : null;
  const activeBenefits = hpSettings?.benefits ? hpSettings.benefits.filter((b) => b.enabled) : null;

  return (
    <main className="bg-[#FBFAF7]">
      {/* Hero section */}
      {(!hpSettings || hpSettings.heroEnabled) && (
        <section className="border-b border-[#E7E3DC] bg-[#F7F5F1]">
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
      )}

      {/* Categories Section */}
      {(!hpSettings || hpSettings.categoriesEnabled) && (
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
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

      {/* Featured / New Arrivals Section */}
      {(!hpSettings || hpSettings.arrivalsEnabled) && (
        <section className="border-y border-[#E7E3DC] bg-[#F7F5F1]">
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#748779]">
                  {hpSettings?.arrivalsEyebrow || "Latest footwear"}
                </p>
                <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-[#20252B] sm:text-3xl md:text-4xl">
                  {hpSettings?.arrivalsHeading || "New arrivals"}
                </h2>
                <p className="mt-1 text-sm text-[#667085]">
                  {hpSettings?.arrivalsDescription || "Explore our newest styles and designs."}
                </p>
              </div>

              <Link
                to={hpSettings?.arrivalsCtaUrl || "/shop"}
                className="group inline-flex items-center gap-1 text-sm font-semibold text-[#748779] transition hover:text-[#5E7063]"
              >
                {hpSettings?.arrivalsCtaLabel || "Shop new arrivals"}
                <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 min-[375px]:grid-cols-2 min-[375px]:gap-4 sm:mt-7 sm:gap-5 lg:grid-cols-4">
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

      {/* Promotional / Sale Banner Section */}
      {(!hpSettings || hpSettings.promoEnabled) && (
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
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

      {/* Benefits Section */}
      <section className="border-y border-[#E7E3DC] bg-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:gap-8 sm:px-6 sm:py-12 md:grid-cols-2 lg:grid-cols-4">
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

      {/* Newsletter Section */}
      {(!hpSettings || hpSettings.newsletterEnabled) && (
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="rounded-2xl border border-[#E7E3DC] bg-[#F7F5F1] px-5 py-10 text-center sm:rounded-3xl sm:px-10 sm:py-12">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#748779]">
              {hpSettings?.newsletterEyebrow || "Stay updated"}
            </p>

            <h2 className="mt-2.5 text-2xl font-bold tracking-tight text-[#20252B] sm:text-3xl">
              {hpSettings?.newsletterHeading || "Get new arrivals and offers"}
            </h2>

            <p className="mx-auto mt-2.5 max-w-xl text-sm leading-relaxed text-[#667085]">
              {hpSettings?.newsletterDescription || "Subscribe to receive information about new products, seasonal collections and store promotions."}
            </p>

            <form
              onSubmit={(event) => event.preventDefault()}
              className="mx-auto mt-5 flex max-w-xl flex-col gap-2.5 sm:mt-7 sm:flex-row"
            >
              <label htmlFor="newsletterEmail" className="sr-only">
                Email address
              </label>

              <input
                id="newsletterEmail"
                type="email"
                placeholder={hpSettings?.newsletterPlaceholder || "Enter your email address"}
                className="min-w-0 flex-1 rounded-xl border border-[#E7E3DC] bg-white px-4 py-3 text-sm text-[#20252B] outline-none transition focus:border-[#748779] focus:ring-1 focus:ring-[#748779] placeholder:text-[#667085]"
              />

              <button
                type="submit"
                className="rounded-xl bg-[#748779] px-7 py-3 text-sm font-semibold text-white shadow-xs transition hover:bg-[#5E7063]"
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
