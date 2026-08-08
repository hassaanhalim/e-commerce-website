import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import ProductCard from "../components/product/ProductCard";
import {
  catalogApi,
  type PublicBrand,
  type PublicCategory,
} from "../services/catalog-api";
import type { Product, ProductGender } from "../types/product";

const GENDERS: ProductGender[] = ["Men", "Women", "Unisex", "Kids"];

type GridCols = 3 | 4;
type DropdownId =
  | "category"
  | "gender"
  | "brand"
  | "availability"
  | "colour"
  | "size"
  | "price"
  | "sort"
  | null;

function ChevronDownIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function FilterDropdown({
  id,
  label,
  isActive,
  isOpen,
  onToggle,
  children,
  width = "w-64",
}: {
  id: DropdownId;
  label: string;
  isActive: boolean;
  isOpen: boolean;
  onToggle: (id: DropdownId) => void;
  children: React.ReactNode;
  width?: string;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onToggle(isOpen ? null : id)}
        className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-medium transition cursor-pointer ${
          isActive
            ? "border-black bg-black text-white"
            : isOpen
            ? "border-gray-900 bg-gray-50 text-gray-900"
            : "border-gray-300 bg-white text-gray-700 hover:border-gray-400"
        }`}
      >
        {label}
        <ChevronDownIcon
          className={`h-3.5 w-3.5 transition-transform ${
            isOpen ? "rotate-180" : ""
          } ${isActive ? "text-white/70" : "text-gray-400"}`}
        />
      </button>

      {isOpen && (
        <div
          className={`absolute left-0 top-full z-50 mt-2 ${width} max-h-72 overflow-y-auto rounded-xl border border-gray-200 bg-white p-3 shadow-xl`}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function ShopPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [_isMobileFiltersOpen, _setIsMobileFiltersOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<DropdownId>(null);
  const [gridCols, setGridCols] = useState<GridCols>(3);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Dynamic state from backend
  const [categories, setCategories] = useState<PublicCategory[]>([]);
  const [brands, setBrands] = useState<PublicBrand[]>([]);
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [paginationMeta, setPaginationMeta] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        openDropdown &&
        toolbarRef.current &&
        !toolbarRef.current.contains(e.target as Node)
      ) {
        setOpenDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openDropdown]);

  const toggleDropdown = useCallback((id: DropdownId) => {
    setOpenDropdown(id);
  }, []);

  // Fetch categories and brands once on mount
  useEffect(() => {
    catalogApi.getCategories().then(setCategories).catch(() => {});
    catalogApi.getBrands().then(setBrands).catch(() => {});
  }, []);

  /* ---- URL search-param readers ---- */
  const selectedGender = (searchParams.get("gender") as ProductGender) || "";
  const selectedCategory = searchParams.get("category") ?? "";
  const selectedBrand = searchParams.get("brand") ?? "";
  const selectedSize = searchParams.get("size") ?? "";
  const selectedColor = searchParams.get("color") ?? searchParams.get("colour") ?? "";
  const minPriceParam = searchParams.get("minPrice") ?? "";
  const maxPriceParam = searchParams.get("maxPrice") ?? "";
  const searchQuery = searchParams.get("search") ?? "";
  const pageParam = Number(searchParams.get("page")) || 1;
  const sortBy = (searchParams.get("sort") as any) ?? "newest";

  /* ---- Fetch products from backend whenever params change ---- */
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError("");

    catalogApi
      .getProducts({
        page: pageParam,
        limit: 20,
        search: searchQuery || undefined,
        category: selectedCategory || undefined,
        brand: selectedBrand || undefined,
        gender: selectedGender ? (selectedGender as ProductGender) : undefined,
        minPrice: minPriceParam ? Number(minPriceParam) : undefined,
        maxPrice: maxPriceParam ? Number(maxPriceParam) : undefined,
        sort: ["newest", "price-asc", "price-desc", "name-asc", "name-desc"].includes(sortBy)
          ? sortBy
          : "newest",
      })
      .then((res) => {
        if (isMounted) {
          // Additional local filter for size and color if passed in UI
          let filtered = res.data;
          if (selectedSize) {
            filtered = filtered.filter((p) => p.sizes.includes(Number(selectedSize)));
          }
          if (selectedColor) {
            filtered = filtered.filter((p) =>
              p.colors.some((c) => c.toLowerCase() === selectedColor.toLowerCase()),
            );
          }

          setProductsList(filtered);
          setPaginationMeta(res.meta);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err?.message || "Failed to load catalog products.");
          setProductsList([]);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [
    pageParam,
    searchQuery,
    selectedCategory,
    selectedBrand,
    selectedGender,
    minPriceParam,
    maxPriceParam,
    sortBy,
    selectedSize,
    selectedColor,
  ]);

  /* ---- helpers ---- */
  const updateFilter = (key: string, value: string | null) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("page"); // reset page on filter change
    if (value === null || value === "" || value === "all") {
      newParams.delete(key);
      if (key === "color") newParams.delete("colour");
    } else {
      newParams.set(key, value);
    }
    setSearchParams(newParams);
  };

  const clearFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const setPage = (page: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("page", String(page));
    setSearchParams(newParams);
  };

  const OptionButton = ({
    label,
    isSelected,
    onClick,
  }: {
    label: string;
    isSelected: boolean;
    onClick: () => void;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition cursor-pointer ${
        isSelected
          ? "bg-gray-900 font-semibold text-white"
          : "text-gray-700 hover:bg-gray-100"
      }`}
    >
      {label}
    </button>
  );

  const Chip = ({ label, onRemove }: { label: string; onRemove: () => void }) => (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-800 shadow-sm">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="text-gray-400 transition hover:text-gray-900 cursor-pointer"
      >
        <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor">
          <path d="M3.05 3.05a.75.75 0 011.06 0L6 4.94l1.89-1.89a.75.75 0 111.06 1.06L7.06 6l1.89 1.89a.75.75 0 11-1.06 1.06L6 7.06 4.11 8.95a.75.75 0 11-1.06-1.06L4.94 6 3.05 4.11a.75.75 0 010-1.06z" />
        </svg>
      </button>
    </span>
  );

  const activeChips: { label: string; onRemove: () => void }[] = [];
  if (searchQuery)
    activeChips.push({
      label: `Search: "${searchQuery}"`,
      onRemove: () => updateFilter("search", null),
    });
  if (selectedGender)
    activeChips.push({
      label: `Gender: ${selectedGender}`,
      onRemove: () => updateFilter("gender", null),
    });
  if (selectedCategory)
    activeChips.push({
      label: `Category: ${selectedCategory}`,
      onRemove: () => updateFilter("category", null),
    });
  if (selectedBrand)
    activeChips.push({
      label: `Brand: ${selectedBrand}`,
      onRemove: () => updateFilter("brand", null),
    });
  if (selectedSize)
    activeChips.push({
      label: `Size: ${selectedSize}`,
      onRemove: () => updateFilter("size", null),
    });
  if (selectedColor)
    activeChips.push({
      label: `Colour: ${selectedColor}`,
      onRemove: () => updateFilter("color", null),
    });
  if (minPriceParam)
    activeChips.push({
      label: `Min: Rs. ${minPriceParam}`,
      onRemove: () => updateFilter("minPrice", null),
    });
  if (maxPriceParam)
    activeChips.push({
      label: `Max: Rs. ${maxPriceParam}`,
      onRemove: () => updateFilter("maxPrice", null),
    });

  const SORT_OPTIONS: { value: string; label: string }[] = [
    { value: "newest", label: "Newest Arrivals" },
    { value: "price-asc", label: "Price: Low to High" },
    { value: "price-desc", label: "Price: High to Low" },
    { value: "name-asc", label: "Name: A to Z" },
    { value: "name-desc", label: "Name: Z to A" },
  ];

  const sortLabel =
    SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? "Newest Arrivals";

  return (
    <main className="mx-auto max-w-7xl px-5 py-8 sm:px-6">
      {/* ========== ROW 1 — Heading & Description ========== */}
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-gray-500">
          Our Collection
        </p>
        <h1 className="mt-1 text-3xl font-bold text-gray-900 sm:text-4xl">
          Shop Shoes
        </h1>
        <p className="mt-2 max-w-2xl text-gray-600">
          Browse real catalog products with dynamic backend filtering, categories, and brands.
        </p>
      </div>

      {/* ========== ROW 2 — Filter Toolbar (desktop) ========== */}
      <div ref={toolbarRef} className="mb-4 hidden lg:block">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Filter:
            </span>

            {/* Category dropdown */}
            <FilterDropdown
              id="category"
              label={selectedCategory || "Category"}
              isActive={!!selectedCategory}
              isOpen={openDropdown === "category"}
              onToggle={toggleDropdown}
            >
              <OptionButton
                label="All Categories"
                isSelected={!selectedCategory}
                onClick={() => {
                  updateFilter("category", null);
                  setOpenDropdown(null);
                }}
              />
              {categories.map((cat) => (
                <OptionButton
                  key={cat.id}
                  label={`${cat.name} (${cat.productCount})`}
                  isSelected={selectedCategory.toLowerCase() === cat.slug.toLowerCase()}
                  onClick={() => {
                    updateFilter(
                      "category",
                      selectedCategory.toLowerCase() === cat.slug.toLowerCase() ? null : cat.slug,
                    );
                    setOpenDropdown(null);
                  }}
                />
              ))}
            </FilterDropdown>

            {/* Gender dropdown */}
            <FilterDropdown
              id="gender"
              label={selectedGender || "Gender"}
              isActive={!!selectedGender}
              isOpen={openDropdown === "gender"}
              onToggle={toggleDropdown}
            >
              <OptionButton
                label="All Genders"
                isSelected={!selectedGender}
                onClick={() => {
                  updateFilter("gender", null);
                  setOpenDropdown(null);
                }}
              />
              {GENDERS.map((g) => (
                <OptionButton
                  key={g}
                  label={g}
                  isSelected={selectedGender.toLowerCase() === g.toLowerCase()}
                  onClick={() => {
                    updateFilter("gender", selectedGender.toLowerCase() === g.toLowerCase() ? null : g);
                    setOpenDropdown(null);
                  }}
                />
              ))}
            </FilterDropdown>

            {/* Brand dropdown */}
            <FilterDropdown
              id="brand"
              label={selectedBrand || "Brand"}
              isActive={!!selectedBrand}
              isOpen={openDropdown === "brand"}
              onToggle={toggleDropdown}
            >
              <OptionButton
                label="All Brands"
                isSelected={!selectedBrand}
                onClick={() => {
                  updateFilter("brand", null);
                  setOpenDropdown(null);
                }}
              />
              {brands.map((b) => (
                <OptionButton
                  key={b.id}
                  label={`${b.name} (${b.productCount})`}
                  isSelected={selectedBrand.toLowerCase() === b.slug.toLowerCase()}
                  onClick={() => {
                    updateFilter(
                      "brand",
                      selectedBrand.toLowerCase() === b.slug.toLowerCase() ? null : b.slug,
                    );
                    setOpenDropdown(null);
                  }}
                />
              ))}
            </FilterDropdown>

            {/* Price dropdown */}
            <FilterDropdown
              id="price"
              label={
                minPriceParam || maxPriceParam
                  ? `Rs. ${minPriceParam || "0"} – ${maxPriceParam || "∞"}`
                  : "Price"
              }
              isActive={!!minPriceParam || !!maxPriceParam}
              isOpen={openDropdown === "price"}
              onToggle={toggleDropdown}
              width="w-64"
            >
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Price Range (Rs.)
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minPriceParam}
                    onChange={(e) => updateFilter("minPrice", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxPriceParam}
                    onChange={(e) => updateFilter("maxPrice", e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
                  />
                </div>
              </div>
            </FilterDropdown>
          </div>

          {/* Right: Sort + Grid-view controls */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                type="button"
                onClick={() => toggleDropdown(openDropdown === "sort" ? null : "sort")}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition hover:border-gray-400 cursor-pointer"
              >
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 mr-1">
                  Sort:
                </span>
                {sortLabel}
                <ChevronDownIcon
                  className={`h-3.5 w-3.5 text-gray-400 transition-transform ${
                    openDropdown === "sort" ? "rotate-180" : ""
                  }`}
                />
              </button>

              {openDropdown === "sort" && (
                <div className="absolute right-0 top-full z-50 mt-2 w-56 max-h-72 overflow-y-auto rounded-xl border border-gray-200 bg-white p-3 shadow-xl">
                  {SORT_OPTIONS.map((opt) => (
                    <OptionButton
                      key={opt.value}
                      label={opt.label}
                      isSelected={sortBy === opt.value}
                      onClick={() => {
                        updateFilter("sort", opt.value);
                        setOpenDropdown(null);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center rounded-xl border border-gray-300 bg-white p-0.5">
              <button
                type="button"
                onClick={() => setGridCols(3)}
                title="3-column grid"
                className={`rounded-lg p-2 transition cursor-pointer ${
                  gridCols === 3 ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="0" y="0" width="4" height="4" rx="1" />
                  <rect x="6" y="0" width="4" height="4" rx="1" />
                  <rect x="12" y="0" width="4" height="4" rx="1" />
                  <rect x="0" y="6" width="4" height="4" rx="1" />
                  <rect x="6" y="6" width="4" height="4" rx="1" />
                  <rect x="12" y="6" width="4" height="4" rx="1" />
                  <rect x="0" y="12" width="4" height="4" rx="1" />
                  <rect x="6" y="12" width="4" height="4" rx="1" />
                  <rect x="12" y="12" width="4" height="4" rx="1" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setGridCols(4)}
                title="4-column grid"
                className={`rounded-lg p-2 transition cursor-pointer ${
                  gridCols === 4 ? "bg-gray-900 text-white" : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
                  <rect x="0" y="0" width="3" height="3" rx="0.75" />
                  <rect x="4.33" y="0" width="3" height="3" rx="0.75" />
                  <rect x="8.67" y="0" width="3" height="3" rx="0.75" />
                  <rect x="13" y="0" width="3" height="3" rx="0.75" />
                  <rect x="0" y="4.33" width="3" height="3" rx="0.75" />
                  <rect x="4.33" y="4.33" width="3" height="3" rx="0.75" />
                  <rect x="8.67" y="4.33" width="3" height="3" rx="0.75" />
                  <rect x="13" y="4.33" width="3" height="3" rx="0.75" />
                  <rect x="0" y="8.67" width="3" height="3" rx="0.75" />
                  <rect x="4.33" y="8.67" width="3" height="3" rx="0.75" />
                  <rect x="8.67" y="8.67" width="3" height="3" rx="0.75" />
                  <rect x="13" y="8.67" width="3" height="3" rx="0.75" />
                  <rect x="0" y="13" width="3" height="3" rx="0.75" />
                  <rect x="4.33" y="13" width="3" height="3" rx="0.75" />
                  <rect x="8.67" y="13" width="3" height="3" rx="0.75" />
                  <rect x="13" y="13" width="3" height="3" rx="0.75" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ========== Active Chips & Count ========== */}
      {activeChips.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-gray-200 pb-4">
          {activeChips.map((chip) => (
            <Chip key={chip.label} label={chip.label} onRemove={chip.onRemove} />
          ))}

          <button
            type="button"
            onClick={clearFilters}
            className="ml-2 text-xs font-semibold text-red-600 underline transition hover:text-red-800 cursor-pointer"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Result count */}
      <p className="mb-6 text-sm font-medium text-gray-600">
        Showing{" "}
        <span className="font-semibold text-gray-900">{paginationMeta.total}</span>{" "}
        {paginationMeta.total === 1 ? "product" : "products"}
      </p>

      {/* ========== Loading / Error / Product Grid ========== */}
      {loading ? (
        <div className="py-24 text-center">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-black border-t-transparent"></div>
          <p className="mt-4 text-sm font-semibold text-gray-500">Loading catalog products...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-red-700">
          <p className="font-bold text-base">{error}</p>
          <button
            onClick={clearFilters}
            className="mt-4 rounded-xl bg-red-700 px-4 py-2 text-xs font-bold text-white hover:bg-red-800 transition"
          >
            Reset Filters
          </button>
        </div>
      ) : productsList.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-12 text-center">
          <h3 className="text-xl font-bold text-gray-900">No products found</h3>
          <p className="mt-2 text-sm text-gray-600">
            No shoes match your selected filters. Remove one or more filters and try again.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-6 inline-flex rounded-xl bg-black px-6 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 cursor-pointer"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <>
          <section
            className={`grid gap-6 ${
              gridCols === 4
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            }`}
          >
            {productsList.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </section>

          {/* ========== Pagination controls ========== */}
          {paginationMeta.totalPages > 1 && (
            <div className="mt-12 flex items-center justify-center gap-2">
              <button
                disabled={paginationMeta.page <= 1}
                onClick={() => setPage(paginationMeta.page - 1)}
                className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-bold text-gray-700 disabled:opacity-40 hover:bg-gray-50 transition cursor-pointer"
              >
                Previous
              </button>
              <span className="text-xs font-bold text-gray-600 px-2">
                Page {paginationMeta.page} of {paginationMeta.totalPages}
              </span>
              <button
                disabled={paginationMeta.page >= paginationMeta.totalPages}
                onClick={() => setPage(paginationMeta.page + 1)}
                className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-bold text-gray-700 disabled:opacity-40 hover:bg-gray-50 transition cursor-pointer"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </main>
  );
}

export default ShopPage;