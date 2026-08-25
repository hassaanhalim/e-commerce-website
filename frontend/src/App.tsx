import { lazy, Suspense } from "react";
import { Route, Routes, useLocation } from "react-router";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import PageLoader from "./components/common/PageLoader";
import Footer from "./components/layout/Footer";
import Navbar from "./components/layout/Navbar";
import ScrollToTop from "./components/layout/ScrollToTop";
import ShoppingAssistant from "./components/shopping-assistant/ShoppingAssistant";

// Critical Core Customer Routes (kept fast for immediate first paint)
import HomePage from "./pages/HomePage";
import ShopPage from "./pages/ShopPage";
import ProductDetailsPage from "./pages/ProductDetailsPage";
import CartPage from "./pages/CartPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

// Secondary & Auxiliary Routes (Code-Split / Lazy Loaded)
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const OrderSuccessPage = lazy(() => import("./pages/OrderSuccessPage"));
const VerifyEmailPage = lazy(() => import("./pages/VerifyEmailPage"));
const GuestWishlistPage = lazy(() => import("./pages/GuestWishlistPage"));
const TrackOrderPage = lazy(() => import("./pages/TrackOrderPage"));
const SearchResultsPage = lazy(() => import("./pages/SearchResultsPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const SizeGuidePage = lazy(() => import("./pages/SizeGuidePage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

// Customer Account Suite (Code-Split / Lazy Loaded)
const AccountLayout = lazy(() => import("./components/layout/AccountLayout"));
const AccountDashboard = lazy(() => import("./pages/account/AccountDashboard"));
const AccountProfile = lazy(() => import("./pages/account/AccountProfile"));
const AccountAddresses = lazy(() => import("./pages/account/AccountAddresses"));
const AccountOrders = lazy(() => import("./pages/account/AccountOrders"));
const AccountOrderDetail = lazy(() => import("./pages/account/AccountOrderDetail"));
const AccountReturns = lazy(() => import("./pages/account/AccountReturns"));
const AccountWishlist = lazy(() => import("./pages/account/AccountWishlist"));
const AccountReviews = lazy(() => import("./pages/account/AccountReviews"));

// Admin Portal Suite (Code-Split / Lazy Loaded)
const AdminLayout = lazy(() => import("./components/admin/AdminLayout"));
const DashboardPage = lazy(() => import("./pages/admin/DashboardPage"));
const ProductListPage = lazy(() => import("./pages/admin/ProductListPage"));
const ProductFormPage = lazy(() => import("./pages/admin/ProductFormPage"));
const CategoriesPage = lazy(() => import("./pages/admin/CategoriesPage"));
const BrandsPage = lazy(() => import("./pages/admin/BrandsPage"));
const InventoryPage = lazy(() => import("./pages/admin/InventoryPage"));
const OrderListPage = lazy(() => import("./pages/admin/OrderListPage"));
const OrderDetailPage = lazy(() => import("./pages/admin/OrderDetailPage"));
const CustomerListPage = lazy(() => import("./pages/admin/CustomerListPage"));
const CustomerDetailPage = lazy(() => import("./pages/admin/CustomerDetailPage"));
const ReviewsPage = lazy(() => import("./pages/admin/ReviewsPage"));
const ReturnsPage = lazy(() => import("./pages/admin/ReturnsPage"));
const ReturnDetailPage = lazy(() => import("./pages/admin/ReturnDetailPage"));
const ReportsPage = lazy(() => import("./pages/admin/ReportsPage"));
const StaffPage = lazy(() => import("./pages/admin/StaffPage"));
const AuditLogPage = lazy(() => import("./pages/admin/AuditLogPage"));
const SettingsPage = lazy(() => import("./pages/admin/SettingsPage"));

function App() {
  const location = useLocation();
  const pathname = location.pathname;
  const isAdminRoute = pathname.startsWith("/admin");

  // Authentication & verification pages where chatbot should be hidden
  const isAuthRoute =
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/register" ||
    pathname.startsWith("/register/") ||
    pathname === "/verify-email" ||
    pathname.startsWith("/verify-email/");

  const showShoppingAssistant = !isAdminRoute && !isAuthRoute;

  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />
      {!isAdminRoute && <Navbar />}

      <div className="flex-1">
        <Suspense fallback={<PageLoader />}>
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
            <Route path="/verify-email" element={<VerifyEmailPage />} />
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
        </Suspense>
      </div>

      {!isAdminRoute && <Footer />}
      {showShoppingAssistant && <ShoppingAssistant />}
    </div>
  );
}

export default App;