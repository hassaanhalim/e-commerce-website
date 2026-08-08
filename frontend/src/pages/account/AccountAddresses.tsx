import { useState, useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import AdminFormField from "../../components/admin/AdminFormField";
import AdminModal from "../../components/admin/AdminModal";
import type { SavedAddress } from "../../types/auth";

export function AccountAddresses() {
  const { getAddresses, saveAddress, deleteAddress, setDefaultAddress } = useAuth();
  const addressList = useMemo(() => getAddresses(), [getAddresses]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);

  // Form states
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState("");

  const handleOpenAddModal = () => {
    setEditingAddress(null);
    setFullName("");
    setPhone("");
    setAddressLine1("");
    setAddressLine2("");
    setCity("");
    setProvince("");
    setPostalCode("");
    setIsDefault(false);
    setError("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (addr: SavedAddress) => {
    setEditingAddress(addr);
    setFullName(addr.fullName);
    setPhone(addr.phone);
    setAddressLine1(addr.addressLine1);
    setAddressLine2(addr.addressLine2 || "");
    setCity(addr.city);
    setProvince(addr.province);
    setPostalCode(addr.postalCode || "");
    setIsDefault(addr.isDefault);
    setError("");
    setIsModalOpen(true);
  };

  const handleSaveAddress = () => {
    if (!fullName.trim() || !phone.trim() || !addressLine1.trim() || !city.trim() || !province.trim()) {
      setError("All fields except Address Line 2 and Postal Code are required.");
      return;
    }

    const payload = {
      fullName: fullName.trim(),
      phone: phone.trim(),
      addressLine1: addressLine1.trim(),
      addressLine2: addressLine2.trim() || undefined,
      city: city.trim(),
      province: province.trim(),
      postalCode: postalCode.trim() || undefined,
      isDefault,
    };

    saveAddress(editingAddress ? { ...payload, id: editingAddress.id } : payload);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Saved Addresses</h1>
          <p className="mt-1 text-sm text-gray-500 font-medium">
            Manage your delivery address details for faster checkouts.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenAddModal}
          className="inline-flex rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition outline-none cursor-pointer"
        >
          + Add Address
        </button>
      </div>

      {/* Address cards grid list */}
      <section className="grid gap-6 sm:grid-cols-2">
        {addressList.length === 0 ? (
          <div className="sm:col-span-2 rounded-2xl border border-gray-200 bg-white p-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h3 className="mt-4 text-lg font-bold text-gray-900">No saved addresses</h3>
            <p className="mt-2 text-sm text-gray-500 font-medium">Add a delivery address to make checkout faster.</p>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="mt-6 inline-flex rounded-xl bg-black px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition outline-none cursor-pointer"
            >
              Add New Address
            </button>
          </div>
        ) : (
          addressList.map((addr) => (
            <article
              key={addr.id}
              className={`rounded-2xl border bg-white p-6 shadow-sm flex flex-col justify-between transition hover:shadow-md ${
                addr.isDefault ? "border-black ring-1 ring-black" : "border-gray-200"
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <h3 className="font-bold text-gray-900 leading-snug">{addr.fullName}</h3>
                  {addr.isDefault && (
                    <span className="inline-flex rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                      Default
                    </span>
                  )}
                </div>
                <div className="mt-3 text-sm text-gray-600 space-y-1 font-medium leading-relaxed">
                  <p>{addr.addressLine1}</p>
                  {addr.addressLine2 && <p>{addr.addressLine2}</p>}
                  <p>
                    {addr.city}, {addr.province}
                  </p>
                  {addr.postalCode && <p>Postal Code: {addr.postalCode}</p>}
                  <p className="mt-2 text-xs text-gray-400">Phone: {addr.phone}</p>
                </div>
              </div>

              {/* Actions row */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-4">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(addr)}
                    className="text-xs font-semibold text-gray-600 hover:text-black transition outline-none cursor-pointer underline"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteAddress(addr.id)}
                    className="text-xs font-semibold text-red-600 hover:text-red-800 transition outline-none cursor-pointer underline"
                  >
                    Delete
                  </button>
                </div>

                {!addr.isDefault && (
                  <button
                    type="button"
                    onClick={() => setDefaultAddress(addr.id)}
                    className="text-xs font-bold text-gray-500 hover:text-black uppercase tracking-wider transition outline-none cursor-pointer border border-gray-300 rounded-lg px-2.5 py-1"
                  >
                    Set as Default
                  </button>
                )}
              </div>
            </article>
          ))
        )}
      </section>

      {/* Add / Edit Address Modal */}
      <AdminModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingAddress ? "Edit Saved Address" : "Add New Address"}
        onConfirm={handleSaveAddress}
        confirmText="Save Address"
      >
        <div className="space-y-4">
          {error && <p className="text-xs font-semibold text-red-500">{error}</p>}

          <AdminFormField
            label="Full Name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Recipient's full name"
          />

          <AdminFormField
            label="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. +92 300 1234567"
          />

          <AdminFormField
            label="Address Line 1"
            value={addressLine1}
            onChange={(e) => setAddressLine1(e.target.value)}
            placeholder="Street address, P.O. box, company name"
          />

          <AdminFormField
            label="Address Line 2 (Optional)"
            value={addressLine2}
            onChange={(e) => setAddressLine2(e.target.value)}
            placeholder="Apartment, suite, unit, building, floor"
          />

          <div className="grid gap-4 sm:grid-cols-3">
            <AdminFormField
              label="City"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Karachi"
            />
            <AdminFormField
              label="Province"
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              placeholder="e.g. Sindh"
            />
            <AdminFormField
              label="Postal Code (Optional)"
              value={postalCode}
              onChange={(e) => setPostalCode(e.target.value)}
              placeholder="e.g. 75400"
            />
          </div>

          <div className="pt-2">
            <AdminFormField
              label="Set as Default Shipping Address"
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault((e.target as HTMLInputElement).checked)}
            />
          </div>
        </div>
      </AdminModal>
    </div>
  );
}

export default AccountAddresses;
