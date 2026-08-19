import { Route, Routes, useLocation } from "react-router";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import Footer from "./components/layout/Footer";
import Navbar from "./components/layout/Navbar";
import ScrollToTop from "./components/layout/ScrollToTop";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import ContactPage from "./pages/ContactPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import NotFoundPage from "./pages/NotFoundPage";
import OrderSuccessPage from "./pages/OrderSuccessPage";
import ProductDetailsPage from "./pages/ProductDetailsPage";
import RegisterPage from "./pages/RegisterPage";
import SearchResultsPage from "./pages/SearchResultsPage";
import ShopPage from "./pages/ShopPage";
import SizeGuidePage from "./pages/SizeGuidePage";

// Customer Account Imports
import AccountLayout from "./components/layout/AccountLayout";
import AccountDashboard from "./pages/account/AccountDashboard";
import AccountProfile from "./pages/account/AccountProfile";
import AccountAddresses from "./pages/account/AccountAddresses";
import AccountOrders from "./pages/account/AccountOrders";
import AccountWishlist from "./pages/account/AccountWishlist";
import GuestWishlistPage from "./pages/GuestWishlistPage";
import AccountOrderDetail from "./pages/account/AccountOrderDetail";
import TrackOrderPage from "./pages/TrackOrderPage";
import AccountReviews from "./pages/account/AccountReviews";
import AccountReturns from "./pages/account/AccountReturns";

// Admin Imports
import AdminLayout from "./components/admin/AdminLayout";
import DashboardPage from "./pages/admin/DashboardPage";
import ProductListPage from "./pages/admin/ProductListPage";
import ProductFormPage from "./pages/admin/ProductFormPage";
import CategoriesPage from "./pages/admin/CategoriesPage";
import BrandsPage from "./pages/admin/BrandsPage";
import InventoryPage from "./pages/admin/InventoryPage";
import OrderListPage from "./pages/admin/OrderListPage";
import OrderDetailPage from "./pages/admin/OrderDetailPage";
import CustomerListPage from "./pages/admin/CustomerListPage";
import CustomerDetailPage from "./pages/admin/CustomerDetailPage";
import ReviewsPage from "./pages/admin/ReviewsPage";
import ReturnsPage from "./pages/admin/ReturnsPage";
import ReturnDetailPage from "./pages/admin/ReturnDetailPage";
import ReportsPage from "./pages/admin/ReportsPage";
import StaffPage from "./pages/admin/StaffPage";
import AuditLogPage from "./pages/admin/AuditLogPage";
import SettingsPage from "./pages/admin/SettingsPage";

function App() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith("/admin");

  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      {!isAdminRoute && <Navbar />}

      <div className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/search" element={<SearchResultsPage />} />
          <Route path="/products/:productId" element={<ProductDetailsPage />} />
          <Route path="/cart" element={<CartPage />} />
          
          {/* Guest checkout remains permitted. */}
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/order-success" element={<OrderSuccessPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/wishlist" element={<GuestWishlistPage />} />
          <Route path="/track-order" element={<TrackOrderPage />} />

          {/* Public informational pages */}
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/size-guide" element={<SizeGuidePage />} />
          
          {/* Nested Customer Account Routes */}
          <Route
            path="/account"
            element={
              <ProtectedRoute allowedRoles={["CUSTOMER"]}>
                <AccountLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AccountDashboard />} />
            <Route path="profile" element={<AccountProfile />} />
            <Route path="addresses" element={<AccountAddresses />} />
            <Route path="orders" element={<AccountOrders />} />
            <Route path="orders/:orderId" element={<AccountOrderDetail />} />
            <Route path="returns" element={<AccountReturns />} />
            <Route path="wishlist" element={<AccountWishlist />} />
            <Route path="reviews" element={<AccountReviews />} />
          </Route>

          {/* Nested Admin Portal Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="products" element={<ProductListPage />} />
            <Route path="products/new" element={<ProductFormPage />} />
            <Route path="products/:productId" element={<ProductFormPage />} />
            <Route path="categories" element={<CategoriesPage />} />
            <Route path="brands" element={<BrandsPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="orders" element={<OrderListPage />} />
            <Route path="orders/:orderId" element={<OrderDetailPage />} />
            <Route path="customers" element={<CustomerListPage />} />
            <Route path="customers/:customerId" element={<CustomerDetailPage />} />
            <Route path="reviews" element={<ReviewsPage />} />
            <Route path="returns" element={<ReturnsPage />} />
            <Route path="returns/:id" element={<ReturnDetailPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="staff" element={<StaffPage />} />
            <Route path="audit-log" element={<AuditLogPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>

      {!isAdminRoute && <Footer />}
    </div>
  );
}

export default App;