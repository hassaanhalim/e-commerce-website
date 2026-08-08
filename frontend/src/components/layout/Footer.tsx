import { Link } from "react-router";

function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link to="/" className="text-xl font-bold tracking-tight text-gray-950">
              Shoe Store
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-7 text-gray-500">
              Quality footwear for everyday comfort, professional settings and
              active lifestyles.
            </p>
          </div>

          {/* Shop */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-gray-950">Shop</h3>
            <ul className="mt-4 space-y-3">
              {[
                { to: "/shop?gender=Men", label: "Men" },
                { to: "/shop?gender=Women", label: "Women" },
                { to: "/shop?category=Sports", label: "Sports" },
                { to: "/shop", label: "All Products" },
              ].map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className="text-sm text-gray-500 transition hover:text-gray-950">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer service */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-gray-950">Help</h3>
            <ul className="mt-4 space-y-3">
              {[
                { to: "/contact", label: "Contact Us" },
                { to: "/size-guide", label: "Size Guide" },
                { to: "/return-policy", label: "Return Policy" },
                { to: "/shipping-policy", label: "Shipping Policy" },
              ].map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className="text-sm text-gray-500 transition hover:text-gray-950">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-gray-950">Account</h3>
            <ul className="mt-4 space-y-3">
              {[
                { to: "/login", label: "Sign In" },
                { to: "/register", label: "Register" },
                { to: "/account/orders", label: "My Orders" },
                { to: "/account/addresses", label: "My Addresses" },
                { to: "/wishlist", label: "My Wishlist" },
              ].map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className="text-sm text-gray-500 transition hover:text-gray-950">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-gray-200 pt-8 sm:flex-row">
          <p className="text-sm text-gray-400">
            &copy; {year} Shoe Store. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link to="/privacy-policy" className="text-sm text-gray-400 transition hover:text-gray-950">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-sm text-gray-400 transition hover:text-gray-950">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
