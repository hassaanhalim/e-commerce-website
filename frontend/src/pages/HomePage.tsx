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
    <main>
      {/* Promo bar */}
      <div className="bg-gray-950 px-5 py-2.5 text-center text-sm font-medium text-white/90">
        Free delivery on orders above{" "}
        <span className="font-bold text-white">PKR 5,000</span>
      </div>

      {/* Hero section */}
      <section className="bg-gray-50">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-14 sm:px-6 lg:grid-cols-2 lg:py-20">
          <div className="max-w-xl">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-500">
              New collection 2025
            </p>

            <h1 className="mt-4 text-4xl font-bold leading-[1.1] tracking-tight text-gray-950 sm:text-5xl lg:text-6xl">
              Step into comfort and confidence.
            </h1>

            <p className="mt-5 max-w-lg text-lg leading-8 text-gray-600">
              Discover footwear designed for your everyday movement,
              professional style and active lifestyle.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/shop"
                className="inline-flex items-center justify-center rounded-xl bg-gray-950 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                Shop All Shoes
              </Link>

              <Link
                to="/shop?category=Sports"
                className="inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-7 py-3.5 text-sm font-semibold text-gray-900 transition hover:border-gray-900"
              >
                Explore Sports
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-4 border-t border-gray-200 pt-7">
              <div>
                <p className="text-xl font-bold text-gray-950">100%</p>
                <p className="mt-1 text-sm text-gray-500">Quality checked</p>
              </div>

              <div>
                <p className="text-xl font-bold text-gray-950">7 Days</p>
                <p className="mt-1 text-sm text-gray-500">Exchange policy</p>
              </div>

              <div>
                <p className="text-xl font-bold text-gray-950">PKR 5K</p>
                <p className="mt-1 text-sm text-gray-500">Free shipping</p>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl bg-gray-200">
            <img
              src={heroImage}
              alt="New shoe collection — premium footwear arranged on a clean studio surface"
              className="h-full min-h-96 w-full object-cover lg:min-h-[520px]"
            />
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-gray-500">
              Shop by category
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl">
              Find your perfect pair
            </h2>
          </div>

          <Link
            to="/shop"
            className="text-sm font-semibold text-gray-600 transition hover:text-gray-950"
          >
            View all products →
          </Link>
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
            />
          ))}
        </div>
      </section>

      {/* Featured products */}
      <section className="bg-gray-50">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-gray-500">
                Latest footwear
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl">
                New arrivals
              </h2>
              <p className="mt-2 text-gray-600">
                Explore our newest styles and designs.
              </p>
            </div>

            <Link
              to="/shop"
              className="text-sm font-semibold text-gray-600 transition hover:text-gray-950"
            >
              Shop new arrivals →
            </Link>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featuredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Promotion section */}
      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-6">
        <div className="grid overflow-hidden rounded-2xl bg-gray-950 text-white lg:grid-cols-2">
          <div className="flex flex-col justify-center p-8 sm:p-12 lg:p-14">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-gray-400">
              Selected styles
            </p>

            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Save on our best sellers
            </h2>

            <p className="mt-4 max-w-lg leading-7 text-gray-300">
              Shop selected everyday, formal and sports footwear at
              reduced prices while stock lasts.
            </p>

            <Link
              to="/shop"
              className="mt-8 inline-flex w-fit rounded-xl bg-white px-7 py-3.5 text-sm font-semibold text-gray-950 transition hover:bg-gray-100"
            >
              Shop Sale
            </Link>
          </div>

          <div className="min-h-64 overflow-hidden lg:min-h-80">
            <img
              src={salePromoImage}
              alt="Seasonal shoe sale — curated collection of premium footwear"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="border-y border-gray-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Delivery */}
          <div className="flex items-start gap-4">
            <div className="shrink-0 rounded-xl bg-gray-100 p-3">
              <svg className="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l-1 9a2 2 0 002 2h12a2 2 0 002-2L19 8M10 12h4" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-950">Reliable Delivery</h3>
              <p className="mt-1 text-sm leading-6 text-gray-500">
                Secure delivery throughout supported areas in Pakistan.
              </p>
            </div>
          </div>

          {/* Exchange */}
          <div className="flex items-start gap-4">
            <div className="shrink-0 rounded-xl bg-gray-100 p-3">
              <svg className="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-950">Easy Size Exchange</h3>
              <p className="mt-1 text-sm leading-6 text-gray-500">
                Request a size exchange according to our exchange policy.
              </p>
            </div>
          </div>

          {/* Secure */}
          <div className="flex items-start gap-4">
            <div className="shrink-0 rounded-xl bg-gray-100 p-3">
              <svg className="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-950">Secure Checkout</h3>
              <p className="mt-1 text-sm leading-6 text-gray-500">
                Customer information and payment details are protected.
              </p>
            </div>
          </div>

          {/* Support */}
          <div className="flex items-start gap-4">
            <div className="shrink-0 rounded-xl bg-gray-100 p-3">
              <svg className="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-950">Customer Support</h3>
              <p className="mt-1 text-sm leading-6 text-gray-500">
                Contact our team for product and order assistance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-6">
        <div className="rounded-2xl bg-gray-50 px-6 py-14 text-center sm:px-10">
          <p className="text-xs font-bold uppercase tracking-[0.15em] text-gray-500">
            Stay updated
          </p>

          <h2 className="mt-3 text-3xl font-bold tracking-tight text-gray-950">
            Get new arrivals and offers
          </h2>

          <p className="mx-auto mt-3 max-w-xl text-gray-600">
            Subscribe to receive information about new products,
            seasonal collections and store promotions.
          </p>

          <form
            onSubmit={(event) => event.preventDefault()}
            className="mx-auto mt-8 flex max-w-xl flex-col gap-3 sm:flex-row"
          >
            <label htmlFor="newsletterEmail" className="sr-only">
              Email address
            </label>

            <input
              id="newsletterEmail"
              type="email"
              placeholder="Enter your email address"
              className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-5 py-3.5 text-sm outline-none transition focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
            />

            <button
              type="submit"
              className="rounded-xl bg-gray-950 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-gray-800"
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
