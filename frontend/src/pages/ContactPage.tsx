import { useState, type FormEvent } from "react";

function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <main className="mx-auto max-w-7xl px-5 py-14 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-gray-500">Get in touch</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-gray-950">Contact Us</h1>
        <p className="mt-4 text-gray-600">
          Have a question about an order, product or our policies? Fill out the
          form below and we will get back to you as soon as possible.
        </p>

        {submitted ? (
          <div className="mt-10 rounded-2xl border border-green-200 bg-green-50 p-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <svg className="h-7 w-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mt-4 text-xl font-bold text-gray-950">Message sent</h2>
            <p className="mt-2 text-gray-600">
              Thank you for reaching out. We will respond within 1-2 business days.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-10 space-y-5 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label htmlFor="contactName" className="block text-sm font-medium text-gray-900">
                  Full name
                </label>
                <input
                  id="contactName"
                  type="text"
                  required
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
                  placeholder="Your full name"
                />
              </div>
              <div>
                <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-900">
                  Email address
                </label>
                <input
                  id="contactEmail"
                  type="email"
                  required
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="contactSubject" className="block text-sm font-medium text-gray-900">
                Subject
              </label>
              <input
                id="contactSubject"
                type="text"
                required
                className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
                placeholder="Order enquiry, product question…"
              />
            </div>

            <div>
              <label htmlFor="contactMessage" className="block text-sm font-medium text-gray-900">
                Message
              </label>
              <textarea
                id="contactMessage"
                rows={5}
                required
                className="mt-2 w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-gray-400 focus:ring-1 focus:ring-gray-400"
                placeholder="Describe your enquiry in detail…"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-xl bg-gray-950 px-6 py-3.5 font-semibold text-white transition hover:bg-gray-800"
            >
              Send Message
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

export default ContactPage;
