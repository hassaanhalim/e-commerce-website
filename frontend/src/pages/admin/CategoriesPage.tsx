import { useEffect, useState } from "react";
import { catalogAdminApi } from "../../services/admin/catalog-admin-api";
import AdminTable, { type Column } from "../../components/admin/AdminTable";
import AdminModal from "../../components/admin/AdminModal";
import AdminFormField from "../../components/admin/AdminFormField";
import AdminStatusBadge from "../../components/admin/AdminStatusBadge";
import type { AdminCategory } from "../../types/admin";

export function CategoriesPage() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<AdminCategory | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState("");

  const loadCategories = () => {
    setLoading(true);
    catalogAdminApi
      .getCategories({ limit: 100 })
      .then((res) => {
        setCategories(res.data);
      })
      .catch((err) => {
        setError(err?.message || "Failed to load categories.");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleOpenAddModal = () => {
    setName("");
    setSlug("");
    setDescription("");
    setIsActive(true);
    setError("");
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (cat: AdminCategory) => {
    setSelectedCategory(cat);
    setName(cat.name);
    setSlug(cat.slug || "");
    setDescription(cat.description || "");
    setIsActive(cat.isActive);
    setError("");
    setIsEditModalOpen(true);
  };

  const handleAddCategory = async () => {
    if (!name.trim()) {
      setError("Category name is required.");
      return;
    }

    try {
      await catalogAdminApi.createCategory({
        name: name.trim(),
        slug: slug.trim() || undefined,
        description: description.trim() || undefined,
        isActive,
      });
      setIsAddModalOpen(false);
      loadCategories();
    } catch (err: any) {
      setError(err?.message || "Failed to create category.");
    }
  };

  const handleUpdateCategory = async () => {
    if (!selectedCategory) return;
    if (!name.trim()) {
      setError("Category name is required.");
      return;
    }

    try {
      await catalogAdminApi.updateCategory(selectedCategory.id, {
        name: name.trim(),
        slug: slug.trim() || undefined,
        description: description.trim() || undefined,
        isActive,
      });
      setIsEditModalOpen(false);
      setSelectedCategory(null);
      loadCategories();
    } catch (err: any) {
      setError(err?.message || "Failed to update category.");
    }
  };

  const handleToggleActive = async (cat: AdminCategory) => {
    try {
      await catalogAdminApi.updateCategory(cat.id, { isActive: !cat.isActive });
      loadCategories();
    } catch {
      /* ignore error */
    }
  };

  const columns: Column<AdminCategory>[] = [
    {
      header: "Name",
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
        title="Categories Manager"
        subtitle="Organize your shoes catalog categories. Create, edit or toggle category visibility."
        data={categories}
        columns={columns}
        searchPlaceholder="Search categories..."
        searchKeys={["name", "slug", "description"]}
        primaryAction={
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 outline-none cursor-pointer"
          >
            + New Category
          </button>
        }
        actions={(row) => (
          <button
            type="button"
            onClick={() => handleOpenEditModal(row)}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-bold text-gray-700 hover:border-black hover:bg-gray-50 transition cursor-pointer"
            title="Edit Category"
          >
            Edit
          </button>
        )}
      />

      {loading && <p className="text-xs font-semibold text-gray-400">Loading categories...</p>}

      {/* Add Modal */}
      <AdminModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Category"
        onConfirm={handleAddCategory}
        confirmText="Save Category"
      >
        <div className="space-y-4">
          {error && <p className="text-xs font-bold text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-150">{error}</p>}
          <AdminFormField
            label="Category Name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            placeholder="e.g. Sneakers, Outdoor, Boots"
          />

          <AdminFormField
            label="Slug (optional)"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="e.g. sneakers"
          />

          <AdminFormField
            label="Description"
            type="textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the category collection..."
          />

          <div className="flex items-center gap-2 pt-2">
            <input
              id="catIsActive"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 accent-black cursor-pointer"
            />
            <label htmlFor="catIsActive" className="text-xs font-bold text-gray-700 cursor-pointer">
              Active Category
            </label>
          </div>
        </div>
      </AdminModal>

      {/* Edit Modal */}
      <AdminModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Category"
        onConfirm={handleUpdateCategory}
        confirmText="Update Category"
      >
        <div className="space-y-4">
          {error && <p className="text-xs font-bold text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-150">{error}</p>}
          <AdminFormField
            label="Category Name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            placeholder="e.g. Sneakers"
          />

          <AdminFormField
            label="Slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="e.g. sneakers"
          />

          <AdminFormField
            label="Description"
            type="textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the category collection..."
          />

          <div className="flex items-center gap-2 pt-2">
            <input
              id="catEditIsActive"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 accent-black cursor-pointer"
            />
            <label htmlFor="catEditIsActive" className="text-xs font-bold text-gray-700 cursor-pointer">
              Active Category
            </label>
          </div>
        </div>
      </AdminModal>
    </div>
  );
}

export default CategoriesPage;
