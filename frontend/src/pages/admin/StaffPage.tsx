import { useEffect, useState } from "react";
import { adminApi, type BackendStaffItem } from "../../services/admin-api";
import AdminTable, { type Column } from "../../components/admin/AdminTable";
import { CheckCircleIcon, CloseIcon, AlertIcon } from "../../components/common/Icons";

export function StaffPage() {
  const [staff, setStaff] = useState<BackendStaffItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [error, setError] = useState("");

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchStaff = () => {
    setLoading(true);
    adminApi
      .getStaff(search.trim() || undefined)
      .then((data) => setStaff(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleCreateStaff = async () => {
    setError("");
    setActionMessage("");
    if (!fullName.trim() || !email.trim() || !password) {
      setError("Full name, email, and password are required.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setSubmitting(true);
    try {
      await adminApi.createStaff({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        phone: phone.trim() || undefined,
      });
      setIsAddModalOpen(false);
      setFullName("");
      setEmail("");
      setPassword("");
      setPhone("");
      setActionMessage("Staff administrator created successfully!");
      fetchStaff();
    } catch (err: unknown) {
      const msg = typeof err === "object" && err !== null && "message" in err
        ? (err as { message: string }).message
        : "Failed to create staff account.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (member: BackendStaffItem) => {
    setActionMessage("");
    try {
      await adminApi.updateStaffStatus(member.id, !member.isActive);
      setActionMessage(`Staff member "${member.fullName}" status updated.`);
      fetchStaff();
    } catch (err: unknown) {
      const msg = typeof err === "object" && err !== null && "message" in err
        ? (err as { message: string }).message
        : "Failed to update staff status.";
      alert(msg);
    }
  };

  const columns: Column<BackendStaffItem>[] = [
    {
      header: "Staff Member",
      accessor: (row) => (
        <div>
          <p className="font-bold text-gray-900">{row.fullName}</p>
          <p className="text-xs text-gray-400">Created {new Date(row.createdAt).toLocaleDateString("en-PK")}</p>
        </div>
      ),
      sortable: true,
    },
    {
      header: "Email Address",
      accessor: "email",
      sortable: true,
    },
    {
      header: "Phone",
      accessor: (row) => row.phone || "—",
    },
    {
      header: "Role",
      accessor: () => <span className="rounded bg-black px-2 py-0.5 text-[10px] font-bold text-white uppercase">ADMIN</span>,
    },
    {
      header: "Status",
      accessor: (row) => (
        <span
          className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-bold ${
            row.isActive ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
          }`}
        >
          {row.isActive ? "Active" : "Deactivated"}
        </span>
      ),
      sortable: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-gray-950 tracking-tight">Staff Management</h1>
          <p className="text-xs text-gray-500 font-medium">Manage administrative staff accounts, access credentials, and active status.</p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder="Search staff..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchStaff()}
            className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-black"
          />

          <button
            type="button"
            onClick={() => {
              setError("");
              setIsAddModalOpen(true);
            }}
            className="rounded-xl bg-black px-4 py-2 text-xs font-bold text-white hover:bg-gray-800 transition cursor-pointer"
          >
            + Create Staff
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-800">
          <CheckCircleIcon className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{actionMessage}</span>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-black border-t-transparent" />
          <p className="mt-3 text-xs font-semibold text-gray-400">Loading staff directory...</p>
        </div>
      ) : (
        <AdminTable
          data={staff}
          columns={columns}
          searchKeys={["fullName", "email"]}
          actions={(row) => (
            <button
              type="button"
              onClick={() => handleToggleStatus(row)}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition cursor-pointer ${
                row.isActive
                  ? "border border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                  : "border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              }`}
            >
              {row.isActive ? "Deactivate" : "Activate"}
            </button>
          )}
        />
      )}

      {/* Create Staff Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-extrabold text-gray-950">Create Administrator</h3>
              <button type="button" onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-black cursor-pointer">
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-1.5 rounded-xl bg-red-50 border border-red-200 p-2.5 text-xs font-semibold text-red-700">
                <AlertIcon className="h-4 w-4 text-red-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="text-[11px] font-bold uppercase text-gray-400">Full Name *</label>
              <input
                type="text"
                placeholder="Admin Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full rounded-xl border border-gray-300 p-2.5 text-xs outline-none focus:border-black mt-1"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase text-gray-400">Email Address *</label>
              <input
                type="email"
                placeholder="staff@shoestore.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-gray-300 p-2.5 text-xs outline-none focus:border-black mt-1"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase text-gray-400">Password (Min 8 Chars) *</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-gray-300 p-2.5 text-xs outline-none focus:border-black mt-1"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase text-gray-400">Phone (Optional)</label>
              <input
                type="text"
                placeholder="+92 300 1234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-gray-300 p-2.5 text-xs outline-none focus:border-black mt-1"
              />
            </div>

            <button
              type="button"
              onClick={handleCreateStaff}
              disabled={submitting}
              className="w-full rounded-xl bg-black py-3 text-xs font-bold text-white hover:bg-gray-800 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? "Creating Account..." : "Create Staff Account"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default StaffPage;
