import { useState, useEffect, type FormEvent } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useWishlist } from "../../context/WishlistContext";

/* ─────────────────────────────────────────────
   Inline SVG icons
   ───────────────────────────────────────────── */
function IconSearch({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function IconBag({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  );
}

function IconHeart({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  );
}

function IconMenu({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

function IconClose({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function IconUser({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -right-1.5 -top-1.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-[#748779] px-1 text-[10px] font-bold leading-none text-white shadow-xs">
      {count > 99 ? "99+" : count}
    </span>
  );
}

/* ─────────────────────────────────────────────
   Navbar
   ───────────────────────────────────────────── */
function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const { cartCount } = useCart();
  const { user, logout, isLoading } = useAuth();
  const { wishlistCount } = useWishlist();

  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  const desktopLinkClass = ({ isActive }: { isActive: boolean }) =>
    `relative py-1 text-sm font-medium transition-colors ${
      isActive
        ? "text-[#20252B] font-semibold after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-[#748779]"
        : "text-[#667085] hover:text-[#20252B]"
    }`;

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanedQuery = searchQuery.trim();
    if (!cleanedQuery) return;
    navigate(`/search?q=${encodeURIComponent(cleanedQuery)}`);
    setMobileMenuOpen(false);
  }

  async function handleLogout() {
    await logout();
    setMobileMenuOpen(false);
    navigate("/");
  }

  const closeMobile = () => setMobileMenuOpen(false);

  const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center border-b border-[#E7E3DC] py-3.5 text-sm font-semibold transition-colors ${
      isActive ? "text-[#748779]" : "text-[#667085] hover:text-[#20252B]"
    }`;

  const wishlistPath = user?.role === "CUSTOMER" ? "/account/wishlist" : "/wishlist";

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-[#E7E3DC] bg-[#FBFAF7]/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-5 px-5 sm:px-6">

          {/* Logo */}
          <Link to="/" className="shrink-0 text-xl font-bold tracking-tight text-[#20252B] flex items-center gap-1.5">
            <span>Shoe Store</span>
            <span className="h-1.5 w-1.5 rounded-full bg-[#748779]"></span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-7 lg:flex" aria-label="Main navigation">
            <NavLink to="/" end className={desktopLinkClass}>Home</NavLink>
            <NavLink to="/shop" className={desktopLinkClass}>Shop</NavLink>
          </nav>

          {/* Desktop search */}
          <form onSubmit={handleSearch} className="hidden min-w-0 flex-1 md:flex" role="search">
            <label htmlFor="desktopSearch" className="sr-only">Search products</label>
            <div className="flex w-full items-center overflow-hidden rounded-xl border border-[#E7E3DC] bg-[#F7F5F1] transition focus-within:border-[#748779] focus-within:bg-white focus-within:ring-1 focus-within:ring-[#748779]">
              <span className="shrink-0 pl-3 text-[#667085]">
                <IconSearch className="h-4 w-4" />
              </span>
              <input
                id="desktopSearch"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search shoes, brands, categories…"
                className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-[#20252B] outline-none placeholder:text-[#667085]"
              />
              <button
                type="submit"
                className="shrink-0 border-l border-[#E7E3DC] px-4 py-2 text-sm font-semibold text-[#667085] transition hover:bg-[#FAF9F6] hover:text-[#20252B]"
              >
                Search
              </button>
            </div>
          </form>

          {/* Desktop right actions */}
          <div className="ml-auto hidden items-center gap-1 lg:flex">
            {!isLoading && !user && (
              <>
                <NavLink to="/login" className={desktopLinkClass}>Login</NavLink>
                <Link
                  to="/register"
                  className="ml-3 rounded-xl bg-[#748779] px-4.5 py-2 text-sm font-semibold text-white shadow-xs transition hover:bg-[#5E7063]"
                >
                  Register
                </Link>
              </>
            )}

            {!isLoading && user?.role === "CUSTOMER" && (
              <NavLink
                to="/account"
                aria-label="My account"
                className="flex items-center justify-center rounded-xl p-2 text-[#667085] transition hover:bg-[#F7F5F1] hover:text-[#20252B]"
              >
                <IconUser />
              </NavLink>
            )}

            {!isLoading && user?.role === "ADMIN" && (
              <NavLink to="/admin" className={desktopLinkClass}>Admin</NavLink>
            )}

            {!isLoading && user && (
              <button
                type="button"
                onClick={handleLogout}
                className="ml-2 text-sm font-medium text-[#667085] transition hover:text-[#20252B]"
              >
                Logout
              </button>
            )}

            <NavLink
              to={wishlistPath}
              aria-label={`Wishlist${wishlistCount > 0 ? `, ${wishlistCount} items` : ""}`}
              className="relative ml-1 flex items-center justify-center rounded-xl p-2 text-[#667085] transition hover:bg-[#F7F5F1] hover:text-[#20252B]"
            >
              <IconHeart />
              <Badge count={wishlistCount} />
            </NavLink>

            <NavLink
              to="/cart"
              aria-label={`Shopping cart${cartCount > 0 ? `, ${cartCount} items` : ""}`}
              className="relative flex items-center justify-center rounded-xl p-2 text-[#667085] transition hover:bg-[#F7F5F1] hover:text-[#20252B]"
            >
              <IconBag />
              <Badge count={cartCount} />
            </NavLink>
          </div>

          {/* Mobile right actions */}
          <div className="ml-auto flex items-center gap-0.5 lg:hidden">
            <NavLink
              to={wishlistPath}
              aria-label={`Wishlist${wishlistCount > 0 ? `, ${wishlistCount} items` : ""}`}
              className="relative flex items-center justify-center rounded-xl p-2 text-[#667085]"
            >
              <IconHeart />
              <Badge count={wishlistCount} />
            </NavLink>

            <NavLink
              to="/cart"
              aria-label={`Shopping cart${cartCount > 0 ? `, ${cartCount} items` : ""}`}
              className="relative flex items-center justify-center rounded-xl p-2 text-[#667085]"
            >
              <IconBag />
              <Badge count={cartCount} />
            </NavLink>

            <button
              type="button"
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="ml-1 flex items-center justify-center rounded-xl border border-[#E7E3DC] p-2 text-[#20252B] transition hover:bg-[#F7F5F1]"
            >
              {mobileMenuOpen ? <IconClose /> : <IconMenu />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="border-t border-[#E7E3DC] bg-[#FBFAF7] px-5 pb-6 pt-2 lg:hidden">
            <form onSubmit={handleSearch} className="mt-2 flex items-center overflow-hidden rounded-xl border border-[#E7E3DC] bg-[#F7F5F1]" role="search">
              <span className="pl-3 text-[#667085]">
                <IconSearch />
              </span>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products…"
                className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-[#20252B] outline-none placeholder:text-[#667085]"
              />
              <button type="submit" className="border-l border-[#E7E3DC] px-4 py-2.5 text-sm font-semibold text-[#667085] transition hover:bg-[#FAF9F6]">
                Go
              </button>
            </form>

            <nav className="mt-2 flex flex-col" aria-label="Mobile navigation">
              <NavLink to="/" end onClick={closeMobile} className={mobileLinkClass}>Home</NavLink>
              <NavLink to="/shop" onClick={closeMobile} className={mobileLinkClass}>Shop</NavLink>
              <NavLink to={wishlistPath} onClick={closeMobile} className={mobileLinkClass}>
                Wishlist{wishlistCount > 0 ? ` (${wishlistCount})` : ""}
              </NavLink>

              {!isLoading && !user && (
                <>
                  <NavLink to="/login" onClick={closeMobile} className={mobileLinkClass}>Login</NavLink>
                  <NavLink to="/register" onClick={closeMobile} className={mobileLinkClass}>Register</NavLink>
                </>
              )}

              {!isLoading && user?.role === "CUSTOMER" && (
                <NavLink to="/account" onClick={closeMobile} className={mobileLinkClass}>My Account</NavLink>
              )}

              {!isLoading && user?.role === "ADMIN" && (
                <NavLink to="/admin" onClick={closeMobile} className={mobileLinkClass}>Admin Dashboard</NavLink>
              )}

              {!isLoading && user && (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="mt-4 w-full rounded-xl border border-[#E7E3DC] py-2.5 text-sm font-semibold text-[#667085] transition hover:bg-[#F7F5F1] hover:text-[#20252B]"
                >
                  Sign Out
                </button>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#20252B]/30 backdrop-blur-xs lg:hidden"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}
    </>
  );
}

export default Navbar;
