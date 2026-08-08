export type ReviewStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface ReviewItem {
  id: string;
  userId: string;
  productId: string;
  orderItemId: string;
  rating: number;
  title?: string | null;
  comment: string;
  status: ReviewStatus;
  moderationNote?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; fullName: string; email?: string };
  product?: { id: string; name: string; slug: string; images?: Array<{ url: string }> };
  moderatedBy?: { id: string; fullName: string; email?: string } | null;
}

export interface PublicReview {
  id: string;
  rating: number;
  title?: string | null;
  comment: string;
  reviewerName: string;
  verifiedPurchase: boolean;
  createdAt: string;
}

export interface RatingSummary {
  averageRating: number;
  reviewCount: number;
  ratingBreakdown: Record<number, number>;
}
