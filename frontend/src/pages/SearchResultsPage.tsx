import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import ProductCard from "../components/product/ProductCard";
import { catalogApi } from "../services/catalog-api";
import type { Product } from "../types/product";

function SearchResultsPage() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get("q")?.trim() ?? "";

  const [matchingProducts, setMatchingProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (!query) {
      setMatchingProducts([]);
      return;
    }

    setLoading(true);
    catalogApi
      .getProducts({ search: query, limit: 50 })
      .then((res) => {
        if (isMounted) setMatchingProducts(res.data);
      })
      .catch(() => {
        if (isMounted) setMatchingProducts([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [query]);

  return (
    <main className="mx-auto max-w-7xl px-5 py-12 sm:px-6">
      <p className="text-sm font-semibold uppercase tracking-wider text-gray-500">
        Product search
      </p>

      <h1 className="mt-2 text-3xl font-bold text-gray-950 sm:text-4xl">
        Search Results
      </h1>

      {query ? (
        <p className="mt-3 text-gray-600">
          {matchingProducts.length}{" "}
          {matchingProducts.length === 1 ? "result" : "results"}{" "}
          found for <span className="font-semibold text-gray-900">“{query}”</span>
        </p>
      ) : (
        <p className="mt-3 text-gray-600">
          Enter a product name, brand, category or colour.
        </p>
      )}

      {loading ? (
        <div className="py-20 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-black border-t-transparent"></div>
          <p className="mt-3 text-xs font-semibold text-gray-400">Searching products...</p>
        </div>
      ) : query && matchingProducts.length > 0 ? (
        <section className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {matchingProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </section>
      ) : query && matchingProducts.length === 0 ? (
        <section className="mt-12 rounded-2xl border border-gray-200 bg-gray-50 px-6 py-14 text-center">
          <h2 className="text-2xl font-bold text-gray-900">No matching products</h2>
          <p className="mt-3 text-gray-600">Try another product name, brand, category or colour.</p>
          <Link
            to="/shop"
            className="mt-7 inline-flex rounded-xl bg-black px-6 py-3 font-semibold text-white transition hover:bg-gray-800"
          >
            Browse All Products
          </Link>
        </section>
      ) : null}
    </main>
  );
}

export default SearchResultsPage;