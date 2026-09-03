import { useEffect, useState } from "react";
import { Link } from "react-router";
import { reviewApi } from "../../services/review-api";
import type { ReviewItem } from "../../types/review";
import { StarRating } from "../../components/common/Icons";

export function AccountReviews() {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    reviewApi
      .getMyReviews({ page, limit: 10 })
      .then((res) => {
        if (isMounted) {
          setReviews(res.data);
          setTotalPages(res.meta.totalPages);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [page]);

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h2 className="text-2xl font-extrabold text-gray-950">My Reviews</h2>
        <p className="text-xs font-semibold text-gray-500 mt-1">
          Track moderation status and review product feedback you've posted.
        </p>
      </div>

      {loading ? (
        <div className="py-20 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-black border-t-transparent" />
          <p className="mt-3 text-xs font-semibold text-gray-400">Loading reviews...</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center space-y-3">
          <p className="text-base font-bold text-gray-900">No reviews submitted</p>
          <p className="text-xs text-gray-500">You haven't reviewed any purchased products yet.</p>
          <Link
            to="/account/orders"
            className="inline-block mt-4 rounded-xl bg-black px-5 py-2.5 text-xs font-bold text-white hover:bg-gray-800 transition"
          >
            View Delivered Orders
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((rev) => (
            <article key={rev.id} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-gray-950">{rev.product?.name || "Product"}</span>
                  <span
                    className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                      rev.status === "APPROVED"
                        ? "bg-emerald-100 text-emerald-800"
                        : rev.status === "REJECTED"
                        ? "bg-red-100 text-red-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {rev.status}
                  </span>
                </div>
                <span className="text-[10px] text-gray-400 font-semibold">{new Date(rev.createdAt).toLocaleDateString("en-PK")}</span>
              </div>

              <StarRating rating={rev.rating} starClassName="h-4 w-4" />

              {rev.title && <h4 className="text-xs font-bold text-gray-900">{rev.title}</h4>}
              <p className="text-xs text-gray-600 font-medium">{rev.comment}</p>

              {rev.moderationNote && (
                <div className="rounded-lg bg-gray-50 p-2 text-[11px] text-gray-500 font-medium">
                  Note from moderator: {rev.moderationNote}
                </div>
              )}
            </article>
          ))}

          {totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-4">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-bold hover:border-black disabled:opacity-40"
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
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-bold hover:border-black disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AccountReviews;
