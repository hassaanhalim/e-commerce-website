import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import AdminFormField from "../../components/admin/AdminFormField";

export function AccountProfile() {
  const { user, updateProfile } = useAuth();

  const [fullName, setFullName] = useState(user?.fullName || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");

  useEffect(() => {
    setFullName(user?.fullName || "");
    setPhone(user?.phone || "");
  }, [user]);

  const handleUpdateProfile = (event: React.FormEvent) => {
    event.preventDefault();
    setProfileSuccess("");
    setProfileError("");

    if (!fullName.trim()) {
      setProfileError("Full Name is required.");
      return;
    }

    try {
      updateProfile(fullName.trim(), phone.trim());
      setProfileSuccess("Personal profile details updated successfully!");
    } catch (error: any) {
      setProfileError(error.message || "Failed to update profile details.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your personal details and contact coordinates.
        </p>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="border-b border-gray-100 pb-3 text-base font-bold text-gray-900">
          Personal Details
        </h2>

        <form onSubmit={handleUpdateProfile} className="mt-4 space-y-4">
          {profileSuccess && (
            <p className="rounded-lg border border-green-150 bg-green-50 p-2.5 text-xs font-semibold text-green-700">
              {profileSuccess}
            </p>
          )}

          {profileError && (
            <p className="rounded-lg border border-red-150 bg-red-50 p-2.5 text-xs font-semibold text-red-700">
              {profileError}
            </p>
          )}

          <AdminFormField
            label="Email Address (Login Identifier)"
            type="email"
            value={user?.email || ""}
            disabled
            helperText="Email address cannot be changed."
          />

          <AdminFormField
            label="Full Name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="e.g. John Doe"
          />

          <AdminFormField
            label="Phone Number"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="e.g. +92 300 1234567"
          />

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="cursor-pointer rounded-xl bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800"
            >
              Save Details
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default AccountProfile;