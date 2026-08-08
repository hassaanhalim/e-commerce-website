export type ReturnRequestType = "RETURN" | "EXCHANGE";

export type ReturnRequestStatus =
  | "REQUESTED"
  | "APPROVED"
  | "REJECTED"
  | "RECEIVED"
  | "COMPLETED"
  | "CANCELLED";

export interface ReturnRequestItem {
  id: string;
  requestNumber: string;
  userId: string;
  orderId: string;
  orderItemId: string;
  type: ReturnRequestType;
  status: ReturnRequestStatus;
  quantity: number;
  reason: string;
  customerNotes?: string | null;
  replacementVariantId?: string | null;
  adminNotes?: string | null;
  refundAmount: number;
  createdAt: string;
  updatedAt: string;
  order?: { id: string; orderNumber: string; status?: string; paymentStatus?: string };
  orderItem?: {
    id: string;
    productNameSnapshot: string;
    skuSnapshot: string;
    unitPrice: number;
    quantity: number;
    sizeSnapshot?: number | null;
    colorSnapshot?: string | null;
    imageSnapshot?: string | null;
  };
  replacementVariant?: {
    id: string;
    sku: string;
    size: number;
    color: string;
    price?: number | null;
    product?: { name: string; slug: string };
  } | null;
  user?: { id: string; fullName: string; email: string; phone?: string | null };
  reviewedBy?: { id: string; fullName: string; email?: string } | null;
}

export interface ReturnEligibilityResult {
  eligible: boolean;
  remainingQuantity: number;
  maxQuantity: number;
  returnWindowDays: number;
  reason?: string;
}
