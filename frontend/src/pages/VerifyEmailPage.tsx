import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useAuth } from "../context/AuthContext";

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const { verifyEmail, resendVerification } = useAuth();

  const [status, setStatus] = useState<"verifying" | "success" | "error">(
    token ? "verifying" : "error",
  );
  const [errorMessage, setErrorMessage] = useState(
    token ? "" : "No verification token was provided in the link.",
  );

  const [resendEmail, setResendEmail] = useState("");
  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [resendMessage, setResendMessage] = useState("");

  useEffect(() => {
    if (!token) return;

    let isMounted = true;

    verifyEmail(token)
      .then(() => {
        if (isMounted) {
          setStatus("success");
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setStatus("error");
          const msg =
            err instanceof Error
              ? err.message
              : "Verification link is invalid or has expired. Please request a new one.";
          setErrorMessage(msg);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [token, verifyEmail]);

  async function handleResendSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!resendEmail.trim()) return;

    setResendStatus("sending");
    setErrorMessage("");
    try {
      const res = await resendVerification(resendEmail.trim());
      setResendStatus("sent");
      setResendMessage(res.message || "A new verification link has been sent to your email.");
    } catch (err: unknown) {
      setResendStatus("idle");
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to send verification email. Please try again.",
      );
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-72px)] max-w-7xl items-center justify-center px-4 py-8 sm:px-6 sm:py-12 bg-[#FBFAF7]">
      <section className="w-full max-w-md rounded-2xl sm:rounded-3xl border border-[#E7E3DC] bg-white p-6 shadow-2xs sm:p-9 text-center">
        {status === "verifying" && (
          <div>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E5EAE6] text-[#748779]">
              <div className="h-6 w-6 animate-spin rounded-full border-3 border-[#748779] border-t-transparent"></div>
            </div>
            <h1 className="mt-4 text-2xl font-bold text-[#20252B]">
              Verifying your email...
            </h1>
            <p className="mt-2 text-sm text-[#667085]">
              Please wait while we activate your customer account.
            </p>
          </div>
        )}

        {status === "success" && (
          <div>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E5EAE6] text-[#748779]">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <p className="mt-4 text-xs font-bold uppercase tracking-[0.15em] text-[#748779]">
              Verification Complete
            </p>

            <h1 className="mt-1.5 text-2xl sm:text-3xl font-bold text-[#20252B]">
              Email Verified!
            </h1>

            <p className="mt-3 text-sm leading-relaxed text-[#667085]">
              Your email address has been verified successfully. Your account is ready for shopping.
            </p>

            <div className="mt-7">
              <Link
                to="/login"
                className="inline-block w-full rounded-xl bg-[#748779] px-6 py-3 text-sm font-semibold text-white shadow-xs transition hover:bg-[#5E7063] cursor-pointer"
              >
                Proceed to Sign In
              </Link>
            </div>
          </div>
        )}

        {status === "error" && (
          <div>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FEF2F2] text-[#DC2626]">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <p className="mt-4 text-xs font-bold uppercase tracking-[0.15em] text-[#DC2626]">
              Verification Issue
            </p>

            <h1 className="mt-1.5 text-2xl sm:text-3xl font-bold text-[#20252B]">
              Verification Failed
            </h1>

            <p className="mt-3 text-sm leading-relaxed text-[#667085]">
              {errorMessage}
            </p>

            {resendStatus === "sent" ? (
              <p className="mt-5 rounded-xl bg-[#E5EAE6] border border-[#748779]/30 p-3 text-xs font-medium text-[#748779]">
                {resendMessage}
              </p>
            ) : (
              <form onSubmit={handleResendSubmit} className="mt-6 space-y-3 text-left">
                <label htmlFor="resendEmailInput" className="text-xs font-bold uppercase tracking-wider text-[#667085]">
                  Request a new verification link
                </label>
                <input
                  id="resendEmailInput"
                  type="email"
                  required
                  value={resendEmail}
                  onChange={(e) => setResendEmail(e.target.value)}
                  placeholder="Enter your registered email"
                  className="w-full rounded-xl border border-[#E7E3DC] bg-white px-4 py-2.5 text-sm text-[#20252B] outline-none transition focus:border-[#748779] focus:ring-1 focus:ring-[#748779]"
                />
                <button
                  type="submit"
                  disabled={resendStatus === "sending"}
                  className="w-full rounded-xl bg-[#748779] px-6 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-[#5E7063] disabled:opacity-50 cursor-pointer"
                >
                  {resendStatus === "sending" ? "Sending link..." : "Send New Verification Link"}
                </button>
              </form>
            )}

            <div className="mt-6 pt-4 border-t border-[#E7E3DC]">
              <Link
                to="/login"
                className="text-xs font-semibold text-[#748779] underline hover:text-[#5E7063]"
              >
                Back to sign in
              </Link>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

export default VerifyEmailPage;
