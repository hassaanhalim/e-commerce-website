import { useEffect, useState } from "react";
import { catalogAdminApi } from "../../services/admin/catalog-admin-api";
import AdminTable, { type Column } from "../../components/admin/AdminTable";
import AdminModal from "../../components/admin/AdminModal";
import AdminFormField from "../../components/admin/AdminFormField";
import AdminStatusBadge from "../../components/admin/AdminStatusBadge";
import type { AdminBrand } from "../../types/admin";

export function BrandsPage() {
  const [brands, setBrands] = useState<AdminBrand[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState<AdminBrand | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState("");

  const loadBrands = () => {
    setLoading(true);
    catalogAdminApi
      .getBrands({ limit: 100 })
      .then((res) => {
        setBrands(res.data);
      })
      .catch((err) => {
        setError(err?.message || "Failed to load brands.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBrands();
  }, []);

  const handleOpenAddModal = () => {
    setName("");
    setSlug("");
    setDescription("");
    setIsActive(true);
    setError("");
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (b: AdminBrand) => {
    setSelectedBrand(b);
    setName(b.name);
    setSlug(b.slug || "");
    setDescription(b.description || "");
    setIsActive(b.isActive);
    setError("");
    setIsEditModalOpen(true);
  };

  const handleAddBrand = async () => {
    if (!name.trim()) {
      setError("Brand name is required.");
      return;
    }

    try {
      await catalogAdminApi.createBrand({
        name: name.trim(),
        slug: slug.trim() || undefined,
        description: description.trim() || undefined,
        isActive,
      });
      setIsAddModalOpen(false);
      loadBrands();
    } catch (err: any) {
      setError(err?.message || "Failed to create brand.");
    }
  };

  const handleUpdateBrand = async () => {
    if (!selectedBrand) return;
    if (!name.trim()) {
      setError("Brand name is required.");
      return;
    }

    try {
      await catalogAdminApi.updateBrand(selectedBrand.id, {
        name: name.trim(),
        slug: slug.trim() || undefined,
        description: description.trim() || undefined,
        isActive,
      });
      setIsEditModalOpen(false);
      setSelectedBrand(null);
      loadBrands();
    } catch (err: any) {
      setError(err?.message || "Failed to update brand.");
    }
  };

  const handleToggleActive = async (b: AdminBrand) => {
    try {
      await catalogAdminApi.updateBrand(b.id, { isActive: !b.isActive });
      loadBrands();
    } catch {
      /* ignore error */
    }
  };

  const columns: Column<AdminBrand>[] = [
    {
      header: "Brand Name",
      accessor: "name",
      sortable: true,
      className: "font-bold text-gray-900",
    },
    {
      header: "Slug",
      accessor: "slug",
      sortable: true,
      className: "font-mono text-xs text-gray-500",
    },
    {
      header: "Description",
      accessor: (row) => row.description || "—",
      sortable: true,
    },
    {
      header: "Active Products",
      accessor: (row) => `${row.productCount} items`,
      sortable: true,
    },
    {
      header: "Status",
      accessor: (row) => (
        <button
          type="button"
          onClick={() => handleToggleActive(row)}
          className="focus:outline-none cursor-pointer"
          title="Click to toggle active status"
        >
          <AdminStatusBadge status={row.isActive ? "active" : "inactive"} />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <AdminTable
        title="Brands Manager"
        subtitle="Manage brands catalog, slugs, and public availability."
        data={brands}
        columns={columns}
        searchPlaceholder="Search brands..."
        searchKeys={["name", "slug", "description"]}
        primaryAction={
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 outline-none cursor-pointer"
          >
            + New Brand
          </button>
        }
        actions={(row) => (
          <button
            type="button"
            onClick={() => handleOpenEditModal(row)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-bold text-gray-700 hover:border-black hover:bg-gray-50 transition cursor-pointer"
            title="Edit Brand"
          >
            Edit
          </button>
        )}
      />

      {loading && <p className="text-xs font-semibold text-gray-400">Loading brands...</p>}

      {/* Add Modal */}
      <AdminModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Brand"
        onConfirm={handleAddBrand}
        confirmText="Save Brand"
      >
        <div className="space-y-4">
          {error && <p className="text-xs font-bold text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-150">{error}</p>}
          <AdminFormField
            label="Brand Name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            placeholder="e.g. Stride, Velocity, Summit"
          />

          <AdminFormField
            label="Slug (optional)"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="e.g. stride"
          />

          <AdminFormField
            label="Description"
            type="textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the brand reputation..."
          />

          <div className="flex items-center gap-2 pt-2">
            <input
              id="brandIsActive"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 accent-black cursor-pointer"
            />
            <label htmlFor="brandIsActive" className="text-xs font-bold text-gray-700 cursor-pointer">
              Active Brand
            </label>
          </div>
        </div>
      </AdminModal>

      {/* Edit Modal */}
      <AdminModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Brand"
        onConfirm={handleUpdateBrand}
        confirmText="Update Brand"
      >
        <div className="space-y-4">
          {error && <p className="text-xs font-bold text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-150">{error}</p>}
          <AdminFormField
            label="Brand Name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            placeholder="e.g. Stride"
          />

          <AdminFormField
            label="Slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="e.g. stride"
          />

          <AdminFormField
            label="Description"
            type="textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the brand reputation..."
          />

          <div className="flex items-center gap-2 pt-2">
            <input
              id="brandEditIsActive"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 accent-black cursor-pointer"
            />
            <label htmlFor="brandEditIsActive" className="text-xs font-bold text-gray-700 cursor-pointer">
              Active Brand
            </label>
          </div>
        </div>
      </AdminModal>
    </div>
  );
}

export default BrandsPage;
