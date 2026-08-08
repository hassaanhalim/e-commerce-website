import { useLocation, useNavigate } from "react-router";
import { useAuth } from "../../context/AuthContext";

export function AdminTopBar() {
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
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-8 shrink-0">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex">
        <ol className="flex items-center space-x-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          <li>
            <span className="text-gray-400">Admin</span>
          </li>
          {pathnames.slice(1).map((value, index) => {
            const isLast = index === pathnames.length - 2;
            const label = value.replace(/-/g, " ");

            return (
              <li key={index} className="flex items-center space-x-2">
                <svg className="h-3 w-3 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                {isLast ? (
                  <span className="text-gray-900 font-bold">{label}</span>
                ) : (
                  <span className="text-gray-500">{label}</span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      {/* User Actions */}
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-bold text-gray-900 leading-none">{user?.fullName}</p>
          <p className="mt-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{user?.role}</p>
        </div>

        <div className="h-8 w-px bg-gray-200" />

        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 transition hover:border-black hover:text-black outline-none"
        >
          <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Logout
        </button>
      </div>
    </header>
  );
}

export default AdminTopBar;
