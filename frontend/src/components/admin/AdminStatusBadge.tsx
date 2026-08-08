interface AdminStatusBadgeProps {
  status: string;
}

export function AdminStatusBadge({ status }: AdminStatusBadgeProps) {
  let colorClasses = "bg-gray-100 text-gray-800";

  switch (status.toLowerCase()) {
    // Orders
    case "pending":
    case "requested":
      colorClasses = "bg-amber-100 text-amber-800 border-amber-200";
      break;
    case "confirmed":
    case "approved":
      colorClasses = "bg-blue-100 text-blue-800 border-blue-200";
      break;
    case "processing":
    case "received":
      colorClasses = "bg-indigo-100 text-indigo-800 border-indigo-200";
      break;
    case "shipped":
      colorClasses = "bg-purple-100 text-purple-800 border-purple-200";
      break;
    case "delivered":
    case "completed":
    case "refunded": // depending on order vs request, we can use green
      colorClasses = "bg-green-100 text-green-800 border-green-200";
      break;
    case "cancelled":
    case "rejected":
    case "failed":
      colorClasses = "bg-red-100 text-red-800 border-red-200";
      break;
    case "active":
      colorClasses = "bg-emerald-100 text-emerald-800 border-emerald-200";
      break;
    case "inactive":
      colorClasses = "bg-gray-100 text-gray-800 border-gray-200";
      break;
    default:
      break;
  }

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${colorClasses}`}>
      {status}
    </span>
  );
}

export default AdminStatusBadge;
