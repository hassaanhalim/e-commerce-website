import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router";
import { catalogAdminApi } from "../../services/admin/catalog-admin-api";
import type { AdminBrand, AdminCategory } from "../../types/admin";
import AdminFormField from "../../components/admin/AdminFormField";

interface ProductImageFormItem {
  id?: string;
  url: string;
  altText: string;
  sortOrder: number;
  isPrimary: boolean;
}

interface ProductFormData {
  name: string;
  slug: string;
  productCode: string;
  brandId: string;
  categoryId: string;
  gender: "Men" | "Women" | "Unisex" | "Kids";
  basePrice: number;
  salePrice?: number | null;
  isNew: boolean;
  isFeatured: boolean;
  isActive: boolean;
  description: string;
}

export interface VariantFormRow {
  id?: string;
  size: number;
  color: string;
  sku: string;
  price?: number | null;
  isActive: boolean;
  initialStock?: number;
  quantityOnHand?: number;
  reservedQuantity?: number;
  availableQuantity?: number;
}

const initialForm: ProductFormData = {
  name: "",
  slug: "",
  productCode: "",
  brandId: "",
  categoryId: "",
  gender: "Unisex",
  basePrice: 0,
  salePrice: undefined,
  isNew: true,
  isFeatured: false,
  isActive: true,
  description: "",
};

const initialImageItems: ProductImageFormItem[] = [
  {
    url: "",
    altText: "",
    sortOrder: 0,
    isPrimary: true,
  },
];

const defaultVariantRows: VariantFormRow[] = [
  { size: 39, color: "White", sku: "SKU-WHITE-39", price: null, isActive: true, initialStock: 10 },
  { size: 40, color: "White", sku: "SKU-WHITE-40", price: null, isActive: true, initialStock: 5 },
  { size: 41, color: "Black", sku: "SKU-BLACK-41", price: null, isActive: true, initialStock: 0 },
];

export function ProductFormPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const isEditMode = productId !== undefined && productId !== "new";

  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [brands, setBrands] = useState<AdminBrand[]>([]);

  const [form, setForm] = useState<ProductFormData>(initialForm);
  const [imageItems, setImageItems] = useState<ProductImageFormItem[]>(initialImageItems);
  const [variantRows, setVariantRows] = useState<VariantFormRow[]>(!isEditMode ? defaultVariantRows : []);

  // Quick variant generator inputs
  const [bulkSizes, setBulkSizes] = useState("39, 40, 41, 42");
  const [bulkColors, setBulkColors] = useState("White, Black");

  // Inventory adjustment modal for existing variants
  const [adjustModalVariant, setAdjustModalVariant] = useState<VariantFormRow | null>(null);
  const [adjustOnHandDelta, setAdjustOnHandDelta] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>("Restock");
  const [adjustSubmitting, setAdjustSubmitting] = useState<boolean>(false);
  const [adjustError, setAdjustError] = useState<string>("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  // Fetch Categories & Brands
  useEffect(() => {
    catalogAdminApi.getCategories({ limit: 100 }).then((res) => {
      setCategories(res.data);
      if (res.data.length > 0 && !form.categoryId) {
        setForm((f) => ({ ...f, categoryId: res.data[0].id }));
      }
    }).catch(() => {});

    catalogAdminApi.getBrands({ limit: 100 }).then((res) => {
      setBrands(res.data);
      if (res.data.length > 0 && !form.brandId) {
        setForm((f) => ({ ...f, brandId: res.data[0].id }));
      }
    }).catch(() => {});
  }, []);

  // Fetch Product details if editing
  useEffect(() => {
    if (isEditMode && productId) {
      setLoading(true);
      catalogAdminApi
        .getProductById(productId)
        .then((prod) => {
          setForm({
            name: prod.name,
            slug: prod.slug,
            productCode: prod.productCode || prod.sku,
            brandId: prod.brandId || "",
            categoryId: prod.categoryId || "",
            gender: prod.gender,
            basePrice: prod.basePrice ?? prod.price,
            salePrice: prod.salePrice ?? undefined,
            isNew: prod.isNew ?? false,
            isFeatured: prod.isFeatured ?? false,
            isActive: prod.isActive ?? true,
            description: prod.description || "",
          });

          if (Array.isArray(prod.variants) && prod.variants.length > 0) {
            setVariantRows(
              prod.variants.map((v: any) => ({
                id: v.id,
                sku: v.sku,
                size: v.size,
                color: v.color,
                price: v.price ?? null,
                isActive: v.isActive ?? true,
                quantityOnHand: v.quantityOnHand ?? 0,
                reservedQuantity: v.reservedQuantity ?? 0,
                availableQuantity: v.availableQuantity ?? 0,
              }))
            );
          }

          // Load images
          if (prod.images && prod.images.length > 0) {
            const loaded: ProductImageFormItem[] = prod.images.map((img, idx) => ({
              id: img.id,
              url: img.url,
              altText: img.altText || "",
              sortOrder: img.sortOrder ?? idx,
              isPrimary: Boolean(img.isPrimary),
            }));

            if (!loaded.some((img) => img.isPrimary)) {
              loaded[0].isPrimary = true;
            }
            setImageItems(loaded);
          } else if (prod.image) {
            setImageItems([
              {
                url: prod.image,
                altText: prod.name,
                sortOrder: 0,
                isPrimary: true,
              },
            ]);
          }
        })
        .catch((err) => {
          setServerError(err?.message || "Product not found.");
        })
        .finally(() => setLoading(false));
    }
  }, [productId, isEditMode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const val = type === "checkbox" ? (e.target as HTMLInputElement).checked : value;

    setForm((f) => ({
      ...f,
      [name]: val,
    }));

    if (errors[name]) {
      setErrors((err) => ({
        ...err,
        [name]: "",
      }));
    }
  };

  // Image Handlers
  const handleAddImage = () => {
    setImageItems((prev) => [
      ...prev,
      {
        url: "",
        altText: "",
        sortOrder: prev.length,
        isPrimary: prev.length === 0,
      },
    ]);
    setErrors((err) => ({ ...err, images: "" }));
  };

  const handleImageFieldChange = (index: number, field: keyof ProductImageFormItem, value: any) => {
    setImageItems((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return updated;
    });
    setErrors((err) => ({ ...err, images: "" }));
  };

  const handleSetPrimaryImage = (index: number) => {
    setImageItems((prev) =>
      prev.map((img, idx) => ({
        ...img,
        isPrimary: idx === index,
      }))
    );
    setErrors((err) => ({ ...err, images: "" }));
  };

  const handleRemoveImage = (index: number) => {
    setImageItems((prev) => {
      const target = prev[index];
      if (isEditMode && target.id) {
        return prev;
      }
      const updated = prev.filter((_, idx) => idx !== index);
      if (updated.length > 0 && !updated.some((img) => img.isPrimary)) {
        updated[0].isPrimary = true;
      }
      return updated;
    });
    setErrors((err) => ({ ...err, images: "" }));
  };

  // Variant Rows Handlers
  const handleAddVariantRow = () => {
    const baseCode = form.productCode.trim().toUpperCase() || "SKU";
    const nextSize = 40;
    const nextColor = "White";
    const sku = `${baseCode}-${nextColor.substring(0, 3).toUpperCase()}-${nextSize}-${Date.now().toString().slice(-3)}`;
    setVariantRows((prev) => [
      ...prev,
      {
        size: nextSize,
        color: nextColor,
        sku,
        price: null,
        isActive: true,
        initialStock: 0,
      },
    ]);
    setErrors((err) => ({ ...err, variants: "" }));
  };

  const handleVariantFieldChange = (index: number, field: keyof VariantFormRow, value: any) => {
    setVariantRows((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return updated;
    });
    setErrors((err) => ({ ...err, variants: "" }));
  };

  const handleRemoveVariantRow = (index: number) => {
    setVariantRows((prev) => prev.filter((_, idx) => idx !== index));
    setErrors((err) => ({ ...err, variants: "" }));
  };

  const handleGenerateVariants = () => {
    const sizesArray = bulkSizes
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((s) => !isNaN(s) && s > 0);

    const colorsArray = bulkColors
      .split(",")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    if (sizesArray.length === 0 || colorsArray.length === 0) {
      setErrors((err) => ({ ...err, variants: "Provide valid sizes and colors to generate variants." }));
      return;
    }

    const baseCode = form.productCode.trim().toUpperCase() || "SKU";
    const generated: VariantFormRow[] = [];

    const existing = isEditMode ? variantRows.filter((v) => Boolean(v.id)) : [];

    for (const size of sizesArray) {
      for (const color of colorsArray) {
        const colorCode = color.substring(0, 3).toUpperCase().replace(/\s/g, "");
        const sku = `${baseCode}-${colorCode}-${size}`;
        if (!existing.some((e) => e.sku === sku || (e.size === size && e.color.toLowerCase() === color.toLowerCase()))) {
          generated.push({
            size,
            color,
            sku,
            price: null,
            isActive: true,
            initialStock: 0,
          });
        }
      }
    }

    setVariantRows([...existing, ...generated]);
    setErrors((err) => ({ ...err, variants: "" }));
  };

  // Adjust Stock Submit
  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModalVariant?.id) return;
    setAdjustError("");
    setAdjustSubmitting(true);
    try {
      const delta = Number(adjustOnHandDelta);
      const updatedInv = await catalogAdminApi.adjustInventory(adjustModalVariant.id, {
        type: delta >= 0 ? "RESTOCK" : "CORRECTION",
        onHandDelta: delta,
        reason: adjustReason.trim() || "Restock",
      });
      setVariantRows((prev) =>
        prev.map((row) =>
          row.id === adjustModalVariant.id
            ? {
                ...row,
                quantityOnHand: updatedInv.quantityOnHand,
                reservedQuantity: updatedInv.reservedQuantity,
                availableQuantity: updatedInv.availableQuantity,
              }
            : row
        )
      );
      setAdjustModalVariant(null);
    } catch (err: any) {
      setAdjustError(err?.message || "Failed to adjust inventory.");
    } finally {
      setAdjustSubmitting(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = "Product name is required.";
    if (!form.productCode.trim()) newErrors.productCode = "Product code is required.";
    if (!form.categoryId) newErrors.categoryId = "Category selection is required.";
    if (!form.brandId) newErrors.brandId = "Brand selection is required.";
    if (form.basePrice <= 0) newErrors.basePrice = "Base price must be greater than zero.";
    if (form.salePrice !== undefined && form.salePrice !== null && form.salePrice <= 0) {
      newErrors.salePrice = "Sale price must be greater than zero.";
    }
    if (form.salePrice !== undefined && form.salePrice !== null && form.salePrice >= form.basePrice) {
      newErrors.salePrice = "Sale price must be lower than the base price.";
    }

    // Images validation
    if (imageItems.length === 0) {
      newErrors.images = "Product must have at least one image.";
    } else if (imageItems.some((img) => !img.url.trim())) {
      newErrors.images = "All product image rows must have a valid URL.";
    } else if (imageItems.filter((img) => img.isPrimary).length === 0) {
      newErrors.images = "Exactly one image must be marked as Primary.";
    } else if (imageItems.filter((img) => img.isPrimary).length > 1) {
      newErrors.images = "Only one image can be marked as Primary.";
    }

    // Variants validation
    if (variantRows.length === 0) {
      newErrors.variants = "Product must have at least one variant.";
    } else {
      const skus = new Set<string>();
      for (const row of variantRows) {
        if (!row.sku.trim()) {
          newErrors.variants = "All variants must have a valid SKU.";
          break;
        }
        if (skus.has(row.sku.trim().toUpperCase())) {
          newErrors.variants = `Duplicate SKU "${row.sku.trim().toUpperCase()}" in variant table.`;
          break;
        }
        skus.add(row.sku.trim().toUpperCase());
        if (!row.size || isNaN(row.size) || row.size < 1) {
          newErrors.variants = "Variant size must be a positive integer.";
          break;
        }
        if (!row.color.trim()) {
          newErrors.variants = "Variant color cannot be empty.";
          break;
        }
        if (!row.id) {
          if (row.initialStock !== undefined && (isNaN(row.initialStock) || row.initialStock < 0)) {
            newErrors.variants = "Stock must be a non-negative integer.";
            break;
          }
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError("");
    if (!validate()) return;

    setLoading(true);

    const baseCode = form.productCode.trim().toUpperCase();

    const variantsPayload = variantRows.map((v) => {
      if (v.id) {
        return {
          id: v.id,
          sku: v.sku.trim().toUpperCase(),
          size: Number(v.size),
          color: v.color.trim(),
          price: v.price ? Number(v.price) : null,
          isActive: v.isActive,
        };
      }

      return {
        sku: v.sku.trim().toUpperCase(),
        size: Number(v.size),
        color: v.color.trim(),
        price: v.price ? Number(v.price) : null,
        isActive: v.isActive,
        initialStock: Number(v.initialStock || 0),
      };
    });

    const sortedImages = [...imageItems].sort((a, b) => a.sortOrder - b.sortOrder);
    const imagesPayload = sortedImages.map((img) => {
      const item: any = {
        url: img.url.trim(),
        altText: img.altText.trim() || undefined,
        sortOrder: Number(img.sortOrder),
        isPrimary: img.isPrimary,
      };

      if (isEditMode && img.id) {
        item.id = img.id;
      }
      return item;
    });

    const payload = {
      name: form.name.trim(),
      slug: form.slug.trim() || undefined,
      productCode: baseCode,
      description: form.description.trim() || form.name.trim(),
      basePrice: Number(form.basePrice),
      salePrice: form.salePrice ? Number(form.salePrice) : null,
      gender: form.gender,
      isNew: form.isNew,
      isFeatured: form.isFeatured,
      isActive: form.isActive,
      categoryId: form.categoryId,
      brandId: form.brandId,
      variants: variantsPayload,
      images: imagesPayload,
    };

    try {
      if (isEditMode && productId) {
        await catalogAdminApi.updateProduct(productId, payload);
      } else {
        await catalogAdminApi.createProduct(payload);
      }
      navigate("/admin/products");
    } catch (err: any) {
      setServerError(err?.message || "Failed to save product. Please check code or SKU uniqueness.");
    } finally {
      setLoading(false);
    }
  };

  const sortedDisplayImages = [...imageItems].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Heading */}
      <div className="flex items-center gap-4">
        <Link
          to="/admin/products"
          className="rounded-xl border border-gray-300 bg-white p-2 text-gray-500 hover:border-black hover:text-black transition"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            {isEditMode ? "Edit Product" : "New Product"}
          </h1>
          <p className="mt-1 text-sm font-semibold text-gray-500 uppercase tracking-wider">
            {isEditMode ? "Modify product details, gallery images & variants" : "Create a new catalog product"}
          </p>
        </div>
      </div>

      {serverError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700">
          {serverError}
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm space-y-8">
        <div className="grid gap-6 sm:grid-cols-2">
          <AdminFormField
            label="Product Name"
            name="name"
            value={form.name}
            onChange={handleChange}
            error={errors.name}
            placeholder="e.g. Urban Runner Sneakers"
          />

          <AdminFormField
            label="Product Code (SKU Prefix)"
            name="productCode"
            value={form.productCode}
            onChange={handleChange}
            error={errors.productCode}
            placeholder="e.g. JOG"
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Category</label>
            <select
              name="categoryId"
              value={form.categoryId}
              onChange={handleChange}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-800 outline-none focus:border-black"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.categoryId && <p className="mt-1 text-xs text-red-600">{errors.categoryId}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Brand</label>
            <select
              name="brandId"
              value={form.brandId}
              onChange={handleChange}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-800 outline-none focus:border-black"
            >
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
            {errors.brandId && <p className="mt-1 text-xs text-red-600">{errors.brandId}</p>}
          </div>

          <AdminFormField
            label="Gender"
            name="gender"
            type="select"
            value={form.gender}
            onChange={handleChange}
            options={[
              { value: "Men", label: "Men" },
              { value: "Women", label: "Women" },
              { value: "Unisex", label: "Unisex" },
              { value: "Kids", label: "Kids" },
            ]}
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <AdminFormField
            label="Base Price (PKR)"
            name="basePrice"
            type="number"
            value={form.basePrice}
            onChange={handleChange}
            error={errors.basePrice}
          />

          <AdminFormField
            label="Sale Price (PKR - Optional)"
            name="salePrice"
            type="number"
            value={form.salePrice || ""}
            onChange={handleChange}
            error={errors.salePrice}
            placeholder="Leave empty if not on discount"
          />
        </div>

        {/* Dynamic Product Images Section */}
        <div className="rounded-2xl border border-gray-200 bg-gray-50/50 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-gray-900">Product Gallery Images</h3>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                Add image URLs, set display sequence order, and select exactly one Primary image.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddImage}
              className="inline-flex rounded-xl bg-black px-3.5 py-2 text-xs font-bold text-white transition hover:bg-gray-800 cursor-pointer"
            >
              + Add Image
            </button>
          </div>

          {errors.images && (
            <p className="text-xs font-bold text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
              {errors.images}
            </p>
          )}

          <div className="space-y-3">
            {sortedDisplayImages.map((imgItem) => {
              const originalIndex = imageItems.findIndex((item) => item === imgItem);
              const isSavedImage = isEditMode && Boolean(imgItem.id);

              return (
                <div
                  key={imgItem.id || `new-img-${originalIndex}`}
                  className={`rounded-xl border p-4 transition ${
                    imgItem.isPrimary
                      ? "border-black bg-amber-50/30"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex items-center gap-2 shrink-0">
                      <input
                        type="radio"
                        name="primaryProductImage"
                        id={`primary-img-${originalIndex}`}
                        checked={imgItem.isPrimary}
                        onChange={() => handleSetPrimaryImage(originalIndex)}
                        className="h-4 w-4 accent-black cursor-pointer"
                      />
                      <label
                        htmlFor={`primary-img-${originalIndex}`}
                        className={`text-xs font-bold cursor-pointer ${
                          imgItem.isPrimary ? "text-amber-900" : "text-gray-600"
                        }`}
                      >
                        {imgItem.isPrimary ? "Primary Image" : "Set Primary"}
                      </label>
                    </div>

                    <div className="h-14 w-14 rounded-lg border border-gray-200 bg-gray-100 overflow-hidden shrink-0">
                      {imgItem.url.trim() ? (
                        <img
                          src={imgItem.url}
                          alt={imgItem.altText || "Preview"}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = "https://placehold.co/100?text=No+Image";
                          }}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-[10px] text-gray-400 font-bold">
                          No URL
                        </div>
                      )}
                    </div>

                    <div className="grid flex-1 gap-3 sm:grid-cols-2 w-full">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-600 mb-1">Image URL</label>
                        <input
                          type="text"
                          value={imgItem.url}
                          onChange={(e) => handleImageFieldChange(originalIndex, "url", e.target.value)}
                          placeholder="https://images.unsplash.com/..."
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-900 outline-none focus:border-black"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-600 mb-1">Alt Text (Optional)</label>
                        <input
                          type="text"
                          value={imgItem.altText}
                          onChange={(e) => handleImageFieldChange(originalIndex, "altText", e.target.value)}
                          placeholder="e.g. Side view in studio light"
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-900 outline-none focus:border-black"
                        />
                      </div>
                    </div>

                    <div className="w-20 shrink-0">
                      <label className="block text-[11px] font-bold text-gray-600 mb-1">Order</label>
                      <input
                        type="number"
                        min="0"
                        value={imgItem.sortOrder}
                        onChange={(e) =>
                          handleImageFieldChange(originalIndex, "sortOrder", Math.max(0, parseInt(e.target.value) || 0))
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900 outline-none focus:border-black"
                      />
                    </div>

                    <div className="shrink-0 pt-4 sm:pt-0">
                      {isSavedImage ? (
                        <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded">
                          Saved Record
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(originalIndex)}
                          className="rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 transition cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Variant & Inventory Section */}
        <div className="rounded-2xl border border-gray-200 bg-gray-50/50 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <span>Product Variants</span>
              </h3>
              <p className="text-xs text-gray-600 font-medium mt-1">
                Configure size, color, SKU, price override, and stock per variant.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAddVariantRow}
                className="inline-flex rounded-xl bg-black px-3.5 py-2 text-xs font-bold text-white transition hover:bg-gray-800 cursor-pointer"
              >
                + Add Variant
              </button>
            </div>
          </div>

          {/* Bulk Generator Utility */}
          <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-3">
            <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider">Bulk Generate Variants</h4>
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Sizes (Comma-separated)</label>
                <input
                  type="text"
                  value={bulkSizes}
                  onChange={(e) => setBulkSizes(e.target.value)}
                  placeholder="39, 40, 41, 42"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-900 outline-none focus:border-black"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Colors (Comma-separated)</label>
                <input
                  type="text"
                  value={bulkColors}
                  onChange={(e) => setBulkColors(e.target.value)}
                  placeholder="White, Black"
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-900 outline-none focus:border-black"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleGenerateVariants}
                  className="w-full rounded-lg border border-blue-600 bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 transition cursor-pointer"
                >
                  Generate Rows
                </button>
              </div>
            </div>
          </div>

          {errors.variants && (
            <p className="text-xs font-bold text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
              {errors.variants}
            </p>
          )}

          {/* Variants Table / List */}
          <div className="space-y-3">
            {variantRows.map((v, idx) => {
              const isSavedVariant = Boolean(v.id);

              return (
                <div
                  key={v.id || `new-v-${idx}`}
                  className={`rounded-xl border p-4 transition space-y-3 ${
                    isSavedVariant ? "border-gray-300 bg-white shadow-xs" : "border-emerald-300 bg-emerald-50/20"
                  }`}
                >
                  <div className="grid gap-3 sm:grid-cols-6 items-center">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 mb-1">Size</label>
                      <input
                        type="number"
                        min="1"
                        value={v.size}
                        onChange={(e) =>
                          handleVariantFieldChange(idx, "size", Math.max(1, parseInt(e.target.value) || 0))
                        }
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-900 outline-none focus:border-black"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 mb-1">Color</label>
                      <input
                        type="text"
                        value={v.color}
                        onChange={(e) => handleVariantFieldChange(idx, "color", e.target.value)}
                        placeholder="White"
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-900 outline-none focus:border-black"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 mb-1">SKU</label>
                      <input
                        type="text"
                        value={v.sku}
                        onChange={(e) => handleVariantFieldChange(idx, "sku", e.target.value)}
                        placeholder="JOG-WHITE-39"
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-mono text-gray-900 outline-none focus:border-black uppercase"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-600 mb-1">Price Override</label>
                      <input
                        type="number"
                        min="0"
                        value={v.price ?? ""}
                        onChange={(e) =>
                          handleVariantFieldChange(
                            idx,
                            "price",
                            e.target.value ? parseFloat(e.target.value) : null
                          )
                        }
                        placeholder="Inherit Base"
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-900 outline-none focus:border-black"
                      />
                    </div>

                    {!isSavedVariant ? (
                      <div>
                        <label className="block text-[11px] font-bold text-emerald-800 mb-1">Stock</label>
                        <input
                          type="number"
                          min="0"
                          value={v.initialStock ?? 0}
                          onChange={(e) =>
                            handleVariantFieldChange(
                              idx,
                              "initialStock",
                              Math.max(0, parseInt(e.target.value) || 0)
                            )
                          }
                          className="w-full rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-gray-900 outline-none focus:border-emerald-600"
                        />
                      </div>
                    ) : (
                      <div className="sm:col-span-2 flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-2.5">
                        <div>
                          <span className="text-[10px] text-gray-500 font-bold block uppercase">Current Stock</span>
                          <span className={`font-mono font-extrabold text-sm ${(v.availableQuantity ?? 0) > 0 ? "text-emerald-700" : "text-red-600"}`}>
                            {v.availableQuantity ?? 0}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setAdjustModalVariant(v);
                            setAdjustOnHandDelta(0);
                            setAdjustReason("Restock");
                            setAdjustError("");
                          }}
                          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-800 hover:border-black hover:bg-gray-50 transition cursor-pointer"
                        >
                          Adjust Stock
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-gray-100 pt-2 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-700">
                      <input
                        type="checkbox"
                        checked={v.isActive}
                        onChange={(e) => handleVariantFieldChange(idx, "isActive", e.target.checked)}
                        className="h-4 w-4 accent-black rounded cursor-pointer"
                      />
                      Active Variant
                    </label>

                    {!isSavedVariant && (
                      <button
                        type="button"
                        onClick={() => handleRemoveVariantRow(idx)}
                        className="text-xs font-bold text-red-600 hover:underline cursor-pointer"
                      >
                        Remove Row
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <AdminFormField
          label="Product Description"
          name="description"
          type="textarea"
          value={form.description}
          onChange={handleChange}
          placeholder="Provide details about materials, responsive cushioning, outer treads..."
        />

        <div className="flex flex-wrap items-center gap-6 border-t border-gray-100 pt-6">
          <AdminFormField
            label="New Arrival"
            name="isNew"
            type="checkbox"
            checked={form.isNew}
            onChange={handleChange}
          />

          <AdminFormField
            label="Featured Item"
            name="isFeatured"
            type="checkbox"
            checked={form.isFeatured}
            onChange={handleChange}
          />

          <AdminFormField
            label="Active Visibility"
            name="isActive"
            type="checkbox"
            checked={form.isActive}
            onChange={handleChange}
          />
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-6">
          <Link
            to="/admin/products"
            className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition outline-none"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 disabled:bg-gray-300 transition outline-none cursor-pointer"
          >
            {loading ? "Saving..." : isEditMode ? "Save Changes" : "Create Product"}
          </button>
        </div>
      </form>

      {/* Simple Adjust Stock Modal */}
      {adjustModalVariant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">Adjust Stock</h3>
                <p className="text-xs text-gray-500 font-mono">
                  {adjustModalVariant.sku} ({adjustModalVariant.size} / {adjustModalVariant.color})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAdjustModalVariant(null)}
                className="text-gray-400 hover:text-black font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 text-xs font-semibold text-gray-700 flex justify-between items-center">
              <span>Current Stock:</span>
              <span className="font-mono font-bold text-sm text-gray-900">
                {adjustModalVariant.availableQuantity ?? 0}
              </span>
            </div>

            {adjustError && (
              <div className="rounded-xl bg-red-50 p-3 text-xs font-bold text-red-700 border border-red-200">
                {adjustError}
              </div>
            )}

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Adjustment (+ for add, - for remove)
                </label>
                <input
                  type="number"
                  value={adjustOnHandDelta}
                  onChange={(e) => setAdjustOnHandDelta(parseInt(e.target.value) || 0)}
                  placeholder="e.g. 10 or -2"
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-900 outline-none focus:border-black"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Reason</label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Restock"
                  className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 outline-none focus:border-black"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
                <button
                  type="button"
                  onClick={() => setAdjustModalVariant(null)}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustSubmitting}
                  className="rounded-xl bg-black px-4 py-2 text-xs font-bold text-white hover:bg-gray-800 transition cursor-pointer disabled:bg-gray-300"
                >
                  {adjustSubmitting ? "Updating..." : "Update Stock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductFormPage;
