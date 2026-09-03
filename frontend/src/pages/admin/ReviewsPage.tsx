import { useEffect, useState } from "react";
import { reviewApi } from "../../services/review-api";
import type { ReviewItem, ReviewStatus } from "../../types/review";
import AdminTable, { type Column } from "../../components/admin/AdminTable";
import AdminStatusBadge from "../../components/admin/AdminStatusBadge";
import {
  StarRating,
  CheckCircleIcon,
  CheckIcon,
  CloseIcon,
} from "../../components/common/Icons";

export function ReviewsPage() {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Moderation Modal State
  const [selectedReview, setSelectedReview] = useState<ReviewItem | null>(null);
  const [moderationNote, setModerationNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState("");

  const fetchReviews = () => {
    setLoading(true);
    const filterStatus = statusFilter === "All" ? undefined : (statusFilter.toUpperCase() as ReviewStatus);

    reviewApi
      .getAdminReviews({
        search: search.trim() || undefined,
        status: filterStatus,
        page,
        limit: 15,
      })
      .then((res) => {
        setReviews(res.data);
        setTotalPages(res.meta.totalPages);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReviews();
  }, [statusFilter, page]);

  const handleModerate = async (status: "APPROVED" | "REJECTED") => {
    if (!selectedReview) return;
    setSubmitting(true);
    setActionSuccess("");
    try {
      await reviewApi.moderateReview(selectedReview.id, status, moderationNote);
      setSelectedReview(null);
      setModerationNote("");
      setActionSuccess(`Review moderated to ${status}.`);
      fetchReviews();
    } catch (err: unknown) {
      alert("Failed to moderate review.");
    } finally {
      setSubmitting(false);
    }
  };

  const columns: Column<ReviewItem>[] = [
    {
      header: "Customer",
      accessor: (row) => (
        <div>
          <p className="font-semibold text-gray-900">{row.user?.fullName || "Customer"}</p>
          <p className="text-xs text-gray-400">{row.user?.email}</p>
        </div>
      ),
      sortable: true,
    },
    {
      header: "Product",
      accessor: (row) => <span className="font-semibold text-gray-900">{row.product?.name || "Product"}</span>,
      sortable: true,
    },
    {
      header: "Rating",
      accessor: (row) => (
        <div className="flex items-center gap-1.5">
          <StarRating rating={row.rating} starClassName="h-3.5 w-3.5" />
          <span className="text-xs font-semibold text-gray-500">({row.rating}/5)</span>
        </div>
      ),
      sortable: true,
    },
    {
      header: "Comment",
      accessor: (row) => <p className="text-xs text-gray-600 line-clamp-2 max-w-xs">{row.comment}</p>,
    },
    {
      header: "Status",
      accessor: (row) => <AdminStatusBadge status={row.status} />,
      sortable: true,
    },
    {
      header: "Date",
      accessor: (row) => new Date(row.createdAt).toLocaleDateString("en-PK", { dateStyle: "medium" }),
      sortable: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-gray-950 tracking-tight">Review Moderation</h1>
          <p className="text-xs text-gray-500 font-medium">Approve or reject customer product ratings and reviews.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            placeholder="Search reviews..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchReviews()}
            className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs outline-none focus:border-black"
          />

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold outline-none focus:border-black cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {actionSuccess && (
        <div className="flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-semibold text-emerald-800">
          <CheckCircleIcon className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-black border-t-transparent" />
          <p className="mt-3 text-xs font-semibold text-gray-400">Loading reviews...</p>
        </div>
      ) : (
        <>
          <AdminTable
            data={reviews}
            columns={columns}
            searchKeys={["comment", "title"]}
            actions={(row) => (
              <button
                type="button"
                onClick={() => setSelectedReview(row)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1 text-xs font-bold text-gray-900 hover:border-black transition cursor-pointer"
              >
                Moderate
              </button>
            )}
          />

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-bold hover:border-black disabled:opacity-40"
              >
                Previous
              </button>
              <span className="flex items-center px-2 text-xs font-bold text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-gray-300 px-3 py-1 text-xs font-bold hover:border-black disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Moderation Modal */}
      {selectedReview && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-extrabold text-gray-950">Moderate Review</h3>
              <button type="button" onClick={() => setSelectedReview(null)} className="text-gray-400 hover:text-black cursor-pointer">
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="text-xs space-y-1">
              <p className="font-bold text-gray-900">{selectedReview.product?.name}</p>
              <p className="text-gray-500">By {selectedReview.user?.fullName} ({selectedReview.user?.email})</p>
              <StarRating rating={selectedReview.rating} starClassName="h-4 w-4" />
              {selectedReview.title && <p className="font-bold text-gray-800">{selectedReview.title}</p>}
              <p className="text-gray-600 bg-gray-50 p-2.5 rounded-xl mt-1">{selectedReview.comment}</p>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase text-gray-400">Moderation Note (Optional)</label>
              <input
                type="text"
                placeholder="Reason for approval/rejection..."
                value={moderationNote}
                onChange={(e) => setModerationNote(e.target.value)}
                className="w-full rounded-xl border border-gray-300 p-2.5 text-xs outline-none mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleModerate("APPROVED")}
                disabled={submitting}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-3 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
              >
                <CheckIcon className="h-4 w-4" />
                <span>Approve Review</span>
              </button>

              <button
                type="button"
                onClick={() => handleModerate("REJECTED")}
                disabled={submitting}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-red-600 py-3 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50 cursor-pointer"
              >
                <CloseIcon className="h-4 w-4" />
                <span>Reject Review</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReviewsPage;
