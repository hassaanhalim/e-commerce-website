import { Outlet } from "react-router";
import { AdminProvider } from "../../context/AdminContext";
import AdminSidebar from "./AdminSidebar";
import AdminTopBar from "./AdminTopBar";

export function AdminLayout() {
  return (
    <AdminProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-gray-50 text-gray-900 font-sans">
        {/* Left Collapsible Sidebar */}
        <AdminSidebar />

        {/* Right main container */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header row with user stats & logout */}
          <AdminTopBar />

          {/* Page body content layout */}
          <main className="flex-1 overflow-y-auto p-8">
            <Outlet />
          </main>
        </div>
      </div>
    </AdminProvider>
  );
}

export default AdminLayout;
