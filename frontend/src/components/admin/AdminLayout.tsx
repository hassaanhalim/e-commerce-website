import { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router";
import { AdminProvider } from "../../context/AdminContext";
import AdminSidebar from "./AdminSidebar";
import AdminTopBar from "./AdminTopBar";

export function AdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  // Close mobile sidebar drawer on route change
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  // Prevent body scrolling when mobile drawer is open
  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isSidebarOpen]);

  // Close mobile drawer on Escape key press
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSidebarOpen]);

  return (
    <AdminProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-gray-50 text-gray-900 font-sans">
        {/* Left Collapsible Sidebar / Mobile Drawer */}
        <AdminSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Right main container */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Header row with hamburger toggle, user stats & logout */}
          <AdminTopBar onOpenSidebar={() => setIsSidebarOpen(true)} />

          {/* Page body content layout */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </AdminProvider>
  );
}

export default AdminLayout;
