import { Link } from "react-router";

function NotFoundPage() {
  return (
    <main className="flex min-h-[calc(100vh-64px)] items-center justify-center px-5 py-20">
      <div className="mx-auto max-w-lg text-center">
        <p className="text-8xl font-bold tracking-tighter text-gray-200">404</p>

        <div className="mt-6 flex justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gray-100">
            <svg className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        <h1 className="mt-6 text-3xl font-bold tracking-tight text-gray-950">
          Page not found
        </h1>

        <p className="mx-auto mt-4 max-w-sm text-gray-600">
          The page you are looking for does not exist or may have been moved.
          Please check the address or return to the home page.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            to="/"
            className="w-full rounded-xl bg-gray-950 px-6 py-3 font-semibold text-white transition hover:bg-gray-800 sm:w-auto"
          >
            Return to Home
          </Link>

          <Link
            to="/shop"
            className="w-full rounded-xl border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-900 transition hover:border-gray-900 sm:w-auto"
          >
            Browse Products
          </Link>
        </div>
      </div>
    </main>
  );
}

export default NotFoundPage;
