import { useEffect, useState } from "react";
import { Link } from "react-router";
import { catalogAdminApi } from "../../services/admin/catalog-admin-api";
import { formatPrice } from "../../utils/formatPrice";
import AdminTable, { type Column } from "../../components/admin/AdminTable";
import AdminModal from "../../components/admin/AdminModal";
import AdminStatusBadge from "../../components/admin/AdminStatusBadge";
import type { AdminProduct } from "../../types/admin";

export function ProductListPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedProduct, setSelectedProduct] = useState<AdminProduct | null>(null);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);

  const loadProducts = () => {
    setLoading(true);
    catalogAdminApi
      .getProducts({ limit: 100 })
      .then((res) => {
        setProducts(res.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleDeactivateClick = (prod: AdminProduct) => {
    setSelectedProduct(prod);
    setIsDeactivateModalOpen(true);
  };

  const handleConfirmDeactivate = async () => {
    if (selectedProduct) {
      try {
        await catalogAdminApi.updateProduct(selectedProduct.id, { isActive: false });
        loadProducts();
      } catch {
        /* ignore */
      }
    }
    setIsDeactivateModalOpen(false);
    setSelectedProduct(null);
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      await catalogAdminApi.updateProduct(id, { isActive: !currentActive });
      loadProducts();
    } catch {
      /* ignore */
    }
  };

  const columns: Column<AdminProduct>[] = [
    {
      header: "Product",
      accessor: (row) => (
        <div className="flex items-center gap-3">
          <img src={row.image} alt={row.name} className="h-10 w-10 rounded-xl object-cover border border-gray-200" />
          <div>
            <p className="font-bold text-gray-900 leading-none">{row.name}</p>
            <p className="mt-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{row.productCode || row.sku}</p>
          </div>
        </div>
      ),
      sortable: true,
    },
    {
      header: "Brand",
      accessor: "brand",
      sortable: true,
    },
    {
      header: "Category",
      accessor: "category",
      sortable: true,
    },
    {
      header: "Gender",
      accessor: "gender",
      sortable: true,
    },
    {
      header: "Price",
      accessor: (row) => (
        <div>
          {row.salePrice ? (
            <div className="flex flex-col">
              <span className="font-bold text-gray-900">{formatPrice(row.salePrice)}</span>
              <span className="text-xs text-gray-400 line-through">{formatPrice(row.basePrice ?? row.price)}</span>
            </div>
          ) : (
            <span className="font-bold text-gray-900">{formatPrice(row.basePrice ?? row.price)}</span>
          )}
        </div>
      ),
      sortable: true,
    },
    {
      header: "Variants",
      accessor: (row) => (
        <span className="inline-flex rounded-lg bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700">
          {(row.variants || []).length} variants
        </span>
      ),
      sortable: true,
    },
    {
      header: "Status",
      accessor: (row) => (
        <button
          type="button"
          onClick={() => handleToggleActive(row.id, row.isActive)}
          className="focus:outline-none cursor-pointer"
          title="Click to toggle status"
        >
          <AdminStatusBadge status={row.isActive ? "active" : "inactive"} />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminTable
        title="Products Catalog"
        subtitle="Manage product list, pricing, variants and visibility."
        data={products}
        columns={columns}
        searchPlaceholder="Search product by name, brand, category, code..."
        searchKeys={["name", "brand", "category", "productCode", "sku"]}
        primaryAction={
          <Link
            to="/admin/products/new"
            className="inline-flex rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 outline-none"
          >
            + Add Product
          </Link>
        }
        actions={(row) => (
          <>
            <Link
              to={`/admin/products/${row.id}`}
              className="rounded-lg border border-gray-300 p-1.5 text-gray-600 hover:border-black hover:text-black transition"
              title="Edit Product"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </Link>
            <button
              type="button"
              onClick={() => handleDeactivateClick(row)}
              className="rounded-lg border border-gray-300 p-1.5 text-red-600 hover:border-red-600 hover:bg-red-50 transition cursor-pointer"
              title="Deactivate Product"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </button>
          </>
        )}
      />

      {loading && <p className="text-xs font-semibold text-gray-400">Loading catalog products...</p>}

      {/* Deactivate Confirmation Modal */}
      <AdminModal
        isOpen={isDeactivateModalOpen}
        onClose={() => setIsDeactivateModalOpen(false)}
        title="Deactivate Product"
        onConfirm={handleConfirmDeactivate}
        confirmText="Deactivate"
        variant="danger"
      >
        <p className="text-sm text-gray-600 leading-relaxed">
          Are you sure you want to deactivate <span className="font-semibold text-gray-900">"{selectedProduct?.name}"</span>? It will be hidden from the public storefront catalog while preserving all order and variant history.
        </p>
      </AdminModal>
    </div>
  );
}

export default ProductListPage;
