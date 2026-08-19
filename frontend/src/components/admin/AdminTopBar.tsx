import { useLocation, useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";

interface AdminTopBarProps {
  onOpenSidebar?: () => void;
}

export function AdminTopBar({ onOpenSidebar }: AdminTopBarProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  // Build breadcrumbs from location.pathname
  const pathnames = location.pathname.split("/").filter((x) => x);

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6 lg:px-8 shrink-0 gap-3">
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile Hamburger Menu Toggle Button */}
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label="Open admin navigation"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-100 hover:text-black transition lg:hidden cursor-pointer shrink-0"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="flex min-w-0 overflow-hidden">
          <ol className="flex items-center space-x-1.5 sm:space-x-2 text-xs font-semibold text-gray-500 uppercase tracking-wider truncate">
            <li>
              <span className="text-gray-400">Admin</span>
            </li>
            {pathnames.slice(1).map((value, index) => {
              const isLast = index === pathnames.length - 2;
              const label = value.replace(/-/g, " ");

              return (
                <li key={index} className="flex items-center space-x-1.5 sm:space-x-2 min-w-0">
                  <svg className="h-3 w-3 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                  {isLast ? (
                    <span className="text-gray-900 font-bold truncate">{label}</span>
                  ) : (
                    <span className="text-gray-500 truncate">{label}</span>
                  )}
                </li>
              );
            })}
          </ol>
        </nav>
      </div>

      {/* User Actions */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-bold text-gray-900 leading-none">{user?.fullName}</p>
          <p className="mt-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{user?.role}</p>
        </div>

        <div className="h-8 w-px bg-gray-200 hidden sm:block" />

        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-2.5 py-1.5 sm:px-3.5 sm:py-2 text-xs font-semibold text-gray-700 transition hover:border-black hover:text-black outline-none cursor-pointer"
        >
          <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}

export default AdminTopBar;
