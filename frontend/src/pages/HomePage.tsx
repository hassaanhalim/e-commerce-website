import { useState, useEffect } from "react";
import { Link } from "react-router";
import CategoryCard from "../components/product/CategoryCard";
import ProductCard from "../components/product/ProductCard";
import { categories } from "../data/categories";
import { catalogApi } from "../services/catalog-api";
import type { Product } from "../types/product";
import heroImage from "../assets/images/hero-collection.png";
import salePromoImage from "../assets/images/sale-promo.png";

function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);

  useEffect(() => {
    let isMounted = true;
    catalogApi
      .getProducts({ limit: 4, isFeatured: true })
      .then((res) => {
        if (isMounted) {
          if (res.data.length > 0) {
            setFeaturedProducts(res.data);
          } else {
            // Fallback to top products if no featured flag
            catalogApi.getProducts({ limit: 4 }).then((fallbackRes) => {
              if (isMounted) setFeaturedProducts(fallbackRes.data);
            });
          }
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <main className="bg-[#FBFAF7]">
      {/* Promo bar */}
      <div className="bg-[#748779] px-5 py-2.5 text-center text-xs font-medium tracking-wide text-white shadow-2xs">
        Free delivery on orders above{" "}
        <span className="font-bold text-white underline decoration-white/40 underline-offset-2">PKR 5,000</span>
      </div>

      {/* Hero section */}
      <section className="border-b border-[#E7E3DC] bg-[#F7F5F1]">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-12 sm:px-6 lg:grid-cols-2 lg:py-16">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#D8C7B2]/60 bg-white/80 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#748779] backdrop-blur-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-[#748779]"></span>
              New Collection 2026
            </div>

            <h1 className="mt-4 text-4xl font-bold leading-[1.12] tracking-tight text-[#20252B] sm:text-5xl lg:text-6xl">
              Step into comfort and confidence.
            </h1>

            <p className="mt-4 max-w-lg text-base leading-relaxed text-[#667085] sm:text-lg">
              Discover footwear designed for your everyday movement,
              professional style and active lifestyle.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/shop"
                className="inline-flex items-center justify-center rounded-xl bg-[#748779] px-7 py-3.5 text-sm font-semibold text-white shadow-xs transition hover:bg-[#5E7063]"
              >
                Shop All Shoes
              </Link>

              <Link
                to="/shop?category=Sports"
                className="inline-flex items-center justify-center rounded-xl border border-[#E7E3DC] bg-white px-7 py-3.5 text-sm font-semibold text-[#20252B] transition hover:border-[#748779] hover:bg-[#FBFAF7]"
              >
                Explore Sports
              </Link>
            </div>

            <div className="mt-9 grid grid-cols-3 gap-4 border-t border-[#E7E3DC] pt-6">
              <div>
                <p className="text-xl font-bold text-[#20252B]">100%</p>
                <p className="mt-0.5 text-xs text-[#667085]">Quality checked</p>
              </div>

              <div className="border-l border-[#E7E3DC] pl-4">
                <p className="text-xl font-bold text-[#20252B]">7 Days</p>
                <p className="mt-0.5 text-xs text-[#667085]">Exchange policy</p>
              </div>

              <div className="border-l border-[#E7E3DC] pl-4">
                <p className="text-xl font-bold text-[#20252B]">PKR 5K</p>
                <p className="mt-0.5 text-xs text-[#667085]">Free shipping</p>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#E7E3DC] bg-[#E8DED1]/30 shadow-2xs">
            <img
              src={heroImage}
              alt="New shoe collection — premium footwear arranged on a clean studio surface"
              className="h-full min-h-96 w-full object-cover lg:min-h-[500px]"
            />
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#748779]">
              Shop by category
            </p>
            <h2 className="mt-1.5 text-3xl font-bold tracking-tight text-[#20252B] sm:text-4xl">
              Find your perfect pair
            </h2>
          </div>

          <Link
            to="/shop"
            className="group inline-flex items-center gap-1 text-sm font-semibold text-[#748779] transition hover:text-[#5E7063]"
          >
            View all products
            <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>

        <div className="mt-7 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
            />
          ))}
        </div>
      </section>

      {/* Featured products */}
      <section className="border-y border-[#E7E3DC] bg-[#F7F5F1]">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#748779]">
                Latest footwear
              </p>
              <h2 className="mt-1.5 text-3xl font-bold tracking-tight text-[#20252B] sm:text-4xl">
                New arrivals
              </h2>
              <p className="mt-1 text-sm text-[#667085]">
                Explore our newest styles and designs.
              </p>
            </div>

            <Link
              to="/shop"
              className="group inline-flex items-center gap-1 text-sm font-semibold text-[#748779] transition hover:text-[#5E7063]"
            >
              Shop new arrivals
              <svg className="h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>

          <div className="mt-7 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featuredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Promotion section — Lighter, sophisticated split treatment */}
      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-6">
        <div className="grid overflow-hidden rounded-3xl border border-[#E7E3DC] bg-gradient-to-br from-[#F7F5F1] via-[#FBFAF7] to-[#E8DED1]/50 text-[#20252B] shadow-2xs lg:grid-cols-2">
          <div className="flex flex-col justify-center p-8 sm:p-12 lg:p-14">
            <div className="w-fit rounded-full bg-[#E5EAE6] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#748779]">
              Selected styles
            </div>

            <h2 className="mt-4 text-3xl font-bold tracking-tight text-[#20252B] sm:text-4xl">
              Save on our best sellers
            </h2>

            <p className="mt-3 max-w-lg leading-relaxed text-[#667085]">
              Shop selected everyday, formal and sports footwear at
              reduced prices while stock lasts.
            </p>

            <Link
              to="/shop"
              className="mt-7 inline-flex w-fit rounded-xl bg-[#748779] px-7 py-3.5 text-sm font-semibold text-white shadow-xs transition hover:bg-[#5E7063]"
            >
              Shop Sale Collection
            </Link>
          </div>

          <div className="min-h-64 overflow-hidden border-t border-[#E7E3DC] lg:min-h-80 lg:border-l lg:border-t-0">
            <img
              src={salePromoImage}
              alt="Seasonal shoe sale — curated collection of premium footwear"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="border-y border-[#E7E3DC] bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Delivery */}
          <div className="flex items-start gap-4">
            <div className="shrink-0 rounded-xl border border-[#E7E3DC] bg-[#F7F5F1] p-3 text-[#748779]">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l-1 9a2 2 0 002 2h12a2 2 0 002-2L19 8M10 12h4" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-[#20252B]">Reliable Delivery</h3>
              <p className="mt-1 text-xs leading-relaxed text-[#667085]">
                Secure delivery throughout supported areas in Pakistan.
              </p>
            </div>
          </div>

          {/* Exchange */}
          <div className="flex items-start gap-4">
            <div className="shrink-0 rounded-xl border border-[#E7E3DC] bg-[#F7F5F1] p-3 text-[#748779]">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-[#20252B]">Easy Size Exchange</h3>
              <p className="mt-1 text-xs leading-relaxed text-[#667085]">
                Request a size exchange according to our exchange policy.
              </p>
            </div>
          </div>

          {/* Secure */}
          <div className="flex items-start gap-4">
            <div className="shrink-0 rounded-xl border border-[#E7E3DC] bg-[#F7F5F1] p-3 text-[#748779]">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-[#20252B]">Secure Checkout</h3>
              <p className="mt-1 text-xs leading-relaxed text-[#667085]">
                Customer information and payment details are protected.
              </p>
            </div>
          </div>

          {/* Support */}
          <div className="flex items-start gap-4">
            <div className="shrink-0 rounded-xl border border-[#E7E3DC] bg-[#F7F5F1] p-3 text-[#748779]">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-[#20252B]">Customer Support</h3>
              <p className="mt-1 text-xs leading-relaxed text-[#667085]">
                Contact our team for product and order assistance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-6">
        <div className="rounded-3xl border border-[#E7E3DC] bg-[#F7F5F1] px-6 py-12 text-center sm:px-10">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#748779]">
            Stay updated
          </p>

          <h2 className="mt-2.5 text-3xl font-bold tracking-tight text-[#20252B]">
            Get new arrivals and offers
          </h2>

          <p className="mx-auto mt-2.5 max-w-xl text-sm leading-relaxed text-[#667085]">
            Subscribe to receive information about new products,
            seasonal collections and store promotions.
          </p>

          <form
            onSubmit={(event) => event.preventDefault()}
            className="mx-auto mt-7 flex max-w-xl flex-col gap-2.5 sm:flex-row"
          >
            <label htmlFor="newsletterEmail" className="sr-only">
              Email address
            </label>

            <input
              id="newsletterEmail"
              type="email"
              placeholder="Enter your email address"
              className="min-w-0 flex-1 rounded-xl border border-[#E7E3DC] bg-white px-4.5 py-3 text-sm text-[#20252B] outline-none transition focus:border-[#748779] focus:ring-1 focus:ring-[#748779] placeholder:text-[#667085]"
            />

            <button
              type="submit"
              className="rounded-xl bg-[#748779] px-7 py-3 text-sm font-semibold text-white shadow-xs transition hover:bg-[#5E7063]"
            >
              Subscribe
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

export default HomePage;
