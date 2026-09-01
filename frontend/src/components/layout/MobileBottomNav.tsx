import { NavLink, useLocation, useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";

function IconHome({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  );
}

function IconGrid({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  );
}

function IconSearch({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
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

function IconUser({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { cartCount } = useCart();
  const { user } = useAuth();

  const pathname = location.pathname;

  const accountPath = user
    ? user.role === "ADMIN"
      ? "/admin"
      : "/account"
    : "/login";

  const handleSearchClick = () => {
    if (pathname === "/") {
      const searchInput = document.getElementById("mobileSearch") as HTMLInputElement | null;
      if (searchInput) {
        searchInput.focus();
        searchInput.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
    }
    navigate("/search");
  };

  const isSearchActive = pathname === "/search";
  const isAccountActive = pathname.startsWith("/account") || pathname === "/login" || pathname === "/register";

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="fixed bottom-0 inset-x-0 z-40 lg:hidden border-t border-[#E7E3DC] bg-[#FBFAF7]/95 backdrop-blur-md shadow-[0_-4px_16px_rgba(0,0,0,0.03)] pb-[env(safe-area-inset-bottom,0px)]"
    >
      <div className="grid h-16 grid-cols-5 items-center px-1">
        {/* 1. Home */}
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 py-1 text-center transition-colors ${
              isActive ? "text-[#748779] font-semibold" : "text-[#667085] hover:text-[#20252B]"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <IconHome className={`h-5.5 w-5.5 ${isActive ? "stroke-[2.25]" : "stroke-[1.75]"}`} />
              <span className="text-[11px] leading-tight tracking-tight">Home</span>
            </>
          )}
        </NavLink>

        {/* 2. Shop */}
        <NavLink
          to="/shop"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 py-1 text-center transition-colors ${
              isActive ? "text-[#748779] font-semibold" : "text-[#667085] hover:text-[#20252B]"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <IconGrid className={`h-5.5 w-5.5 ${isActive ? "stroke-[2.25]" : "stroke-[1.75]"}`} />
              <span className="text-[11px] leading-tight tracking-tight">Shop</span>
            </>
          )}
        </NavLink>

        {/* 3. Search */}
        <button
          type="button"
          onClick={handleSearchClick}
          className={`flex flex-col items-center justify-center gap-1 py-1 text-center transition-colors cursor-pointer ${
            isSearchActive ? "text-[#748779] font-semibold" : "text-[#667085] hover:text-[#20252B]"
          }`}
          aria-label="Search"
        >
          <IconSearch className={`h-5.5 w-5.5 ${isSearchActive ? "stroke-[2.25]" : "stroke-[1.75]"}`} />
          <span className="text-[11px] leading-tight tracking-tight">Search</span>
        </button>

        {/* 4. Cart */}
        <NavLink
          to="/cart"
          className={({ isActive }) =>
            `relative flex flex-col items-center justify-center gap-1 py-1 text-center transition-colors ${
              isActive ? "text-[#748779] font-semibold" : "text-[#667085] hover:text-[#20252B]"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className="relative">
                <IconBag className={`h-5.5 w-5.5 ${isActive ? "stroke-[2.25]" : "stroke-[1.75]"}`} />
                {cartCount > 0 && (
                  <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#748779] px-1 text-[9px] font-bold leading-none text-white shadow-xs">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </div>
              <span className="text-[11px] leading-tight tracking-tight">Cart</span>
            </>
          )}
        </NavLink>

        {/* 5. Account */}
        <NavLink
          to={accountPath}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center gap-1 py-1 text-center transition-colors ${
              isActive || isAccountActive ? "text-[#748779] font-semibold" : "text-[#667085] hover:text-[#20252B]"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <IconUser className={`h-5.5 w-5.5 ${isActive || isAccountActive ? "stroke-[2.25]" : "stroke-[1.75]"}`} />
              <span className="text-[11px] leading-tight tracking-tight">Account</span>
            </>
          )}
        </NavLink>
      </div>
    </nav>
  );
}

export default MobileBottomNav;
