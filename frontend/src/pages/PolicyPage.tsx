import { useParams, Navigate } from "react-router";

const STATIC_POLICIES: Record<string, { title: string; content: string }> = {
  "privacy-policy": {
    title: "Privacy Policy",
    content:
      "We respect your privacy and protect your personal information. Your data is strictly used for order fulfillment, account administration, and customer support. We do not sell or share your personal data with unauthorized third parties.",
  },
  "return-policy": {
    title: "Return & Exchange Policy",
    content:
      "Eligible products can be returned or exchanged within 14 days of delivery. Returned items must be unused, in original packaging, and accompanied by proof of purchase. Refunds are processed upon inspection of returned stock.",
  },
  "shipping-policy": {
    title: "Shipping & Delivery Policy",
    content:
      "Standard orders are processed within 1-2 business days. Delivery across Pakistan typically takes 3-5 business days. Cash on Delivery is available for all nationwide locations.",
  },
  terms: {
    title: "Terms of Service",
    content:
      "By using our store, you agree to comply with our terms and conditions. All product images, descriptions, and pricing are accurate to the best of our knowledge. We reserve the right to update policies at any time.",
  },
};

export function PolicyPage() {
  const { slug } = useParams<{ slug: string }>();
  const policy = slug ? STATIC_POLICIES[slug] : null;

  if (!policy) return <Navigate to="/" replace />;

  return (
    <main className="mx-auto max-w-3xl px-5 py-14 sm:px-6">
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-gray-500">Legal Information</p>
      <h1 className="mt-3 text-4xl font-bold tracking-tight text-gray-950">{policy.title}</h1>

      <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <p className="text-sm leading-7 text-gray-700 font-medium">
          {policy.content}
        </p>
      </div>
    </main>
  );
}

export default PolicyPage;
