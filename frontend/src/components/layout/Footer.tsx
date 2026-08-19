import { useEffect, useState } from "react";
import { Link } from "react-router";
import { homepageApi } from "../../services/homepage-api";

function Footer() {
  const year = new Date().getFullYear();
  const [footerContent, setFooterContent] = useState(() => {
    const cached = homepageApi.getCachedSettings();
    return {
      storeName: cached?.footerStoreName || "Shoe Store",
      description: cached?.footerDescription || "Quality footwear for everyday comfort, professional settings and active lifestyles.",
      copyright: cached?.footerCopyright || `© ${year} Shoe Store. All rights reserved.`,
      email: cached?.footerSupportEmail || "",
      phone: cached?.footerSupportPhone || "",
    };
  });

  useEffect(() => {
    homepageApi
      .getPublicSettings()
      .then((data) => {
        if (data) {
          setFooterContent({
            storeName: data.footerStoreName || "Shoe Store",
            description: data.footerDescription || "Quality footwear for everyday comfort, professional settings and active lifestyles.",
            copyright: data.footerCopyright || `© ${year} Shoe Store. All rights reserved.`,
            email: data.footerSupportEmail || "",
            phone: data.footerSupportPhone || "",
          });
        }
      })
      .catch(() => {});
  }, []);

  return (
    <footer className="border-t border-[#E7E3DC] bg-[#F7F5F1]">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link to="/" className="text-xl font-bold tracking-tight text-[#20252B] flex items-center gap-1.5">
              <span>{footerContent.storeName}</span>
              <span className="h-1.5 w-1.5 rounded-full bg-[#748779]"></span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-[#667085]">
              {footerContent.description}
            </p>
            {(footerContent.email || footerContent.phone) && (
              <div className="mt-3 text-xs text-[#667085] space-y-1 font-medium">
                {footerContent.email && <p>Email: {footerContent.email}</p>}
                {footerContent.phone && <p>Phone: {footerContent.phone}</p>}
              </div>
            )}
          </div>

          {/* Shop */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-[#20252B]">Shop</h3>
            <ul className="mt-4 space-y-2.5">
              {[
                { to: "/shop?gender=Men", label: "Men" },
                { to: "/shop?gender=Women", label: "Women" },
                { to: "/shop?category=Sports", label: "Sports" },
                { to: "/shop", label: "All Products" },
              ].map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className="text-sm font-medium text-[#667085] transition hover:text-[#748779]">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Customer service */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-[#20252B]">Help</h3>
            <ul className="mt-4 space-y-2.5">
              {[
                { to: "/contact", label: "Contact Us" },
                { to: "/size-guide", label: "Size Guide" },
                { to: "/return-policy", label: "Return Policy" },
                { to: "/shipping-policy", label: "Shipping Policy" },
              ].map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className="text-sm font-medium text-[#667085] transition hover:text-[#748779]">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Account */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-[#20252B]">Account</h3>
            <ul className="mt-4 space-y-2.5">
              {[
                { to: "/login", label: "Sign In" },
                { to: "/register", label: "Register" },
                { to: "/account/orders", label: "My Orders" },
                { to: "/account/addresses", label: "My Addresses" },
                { to: "/wishlist", label: "My Wishlist" },
              ].map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className="text-sm font-medium text-[#667085] transition hover:text-[#748779]">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[#E7E3DC] pt-8 sm:flex-row">
          <p className="text-xs text-[#667085]">
            {footerContent.copyright}
          </p>
          <div className="flex gap-6">
            <Link to="/privacy-policy" className="text-xs text-[#667085] transition hover:text-[#748779]">
              Privacy Policy
            </Link>
            <Link to="/terms" className="text-xs text-[#667085] transition hover:text-[#748779]">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
