import {
  useEffect,
  useState,
  type FormEvent,
} from "react";
import {
  Link,
  useLocation,
  useNavigate,
} from "react-router";
import { useAuth } from "../context/AuthContext";
import { GoogleSignInButton } from "../components/auth/GoogleSignInButton";
import type { RegisterUserInput } from "../types/auth";

interface RegisterLocationState {
  from?: string;
}

function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { register, loginWithGoogle, resendVerification, user, isLoading } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  // Post-registration state
  const [isRegistered, setIsRegistered] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [resendStatus, setResendStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [resendMessage, setResendMessage] = useState("");

  useEffect(() => {
    if (!isLoading && user) {
      navigate(user.role === "ADMIN" ? "/admin" : "/account", {
        replace: true,
      });
    }
  }, [isLoading, navigate, user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!fullName.trim() || !email.trim() || !password || !confirmPassword) {
      setError("Complete all required fields.");
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      const response = await register({
        fullName,
        email,
        password,
        phone: phone.trim() || undefined,
      } satisfies RegisterUserInput);

      setRegisteredEmail(response.email || email.trim());
      setIsRegistered(true);
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : "Unable to create the account.");
    }
  }

  async function handleGoogleSuccess(credential: string) {
    setError("");
    try {
      const authenticatedUser = await loginWithGoogle(credential);
      const locationState = location.state as RegisterLocationState | null;

      if (locationState?.from) {
        navigate(locationState.from, {
          replace: true,
        });
        return;
      }

      navigate(authenticatedUser.role === "ADMIN" ? "/admin" : "/account", {
        replace: true,
      });
    } catch (googleError: any) {
      setError(
        googleError instanceof Error
          ? googleError.message
          : "Google sign-up could not be completed.",
      );
    }
  }

  async function handleResendVerification() {
    if (!registeredEmail) return;

    setResendStatus("sending");
    try {
      const result = await resendVerification(registeredEmail);
      setResendStatus("sent");
      setResendMessage(result.message || "A new verification link has been sent to your email.");
    } catch (err: any) {
      setResendStatus("idle");
      setError(
        err instanceof Error ? err.message : "Failed to send verification email. Please try again.",
      );
    }
  }

  // ── Success State: Check Email Screen ─────────────────────────────────────────
  if (isRegistered) {
    return (
      <main className="mx-auto flex min-h-[calc(100vh-72px)] max-w-7xl items-center justify-center px-4 py-8 sm:px-6 sm:py-12 bg-[#FBFAF7]">
        <section className="w-full max-w-md rounded-2xl sm:rounded-3xl border border-[#E7E3DC] bg-white p-6 shadow-2xs sm:p-9 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E5EAE6] text-[#748779]">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>

          <p className="mt-4 text-xs font-bold uppercase tracking-[0.15em] text-[#748779]">
            Account Created
          </p>

          <h1 className="mt-1.5 text-2xl sm:text-3xl font-bold text-[#20252B]">
            Check your email
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-[#667085]">
            We sent a verification link to{" "}
            <span className="font-semibold text-[#20252B]">{registeredEmail}</span>.
          </p>

          <p className="mt-2 text-xs leading-relaxed text-[#8F9BB3]">
            Please click the link inside the email within 60 minutes to activate your account.
          </p>

          {resendStatus === "sent" && (
            <p className="mt-4 rounded-xl bg-[#E5EAE6] border border-[#748779]/30 p-3 text-xs font-medium text-[#748779]">
              {resendMessage}
            </p>
          )}

          {error && (
            <p className="mt-4 rounded-xl bg-[#FEF2F2] border border-[#DC2626]/20 p-3 text-xs font-medium text-[#DC2626]">
              {error}
            </p>
          )}

          <div className="mt-6 space-y-3">
            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resendStatus === "sending"}
              className="w-full rounded-xl border border-[#E7E3DC] bg-white px-6 py-2.5 text-sm font-semibold text-[#20252B] shadow-2xs transition hover:bg-[#F7F5F1] disabled:opacity-50 cursor-pointer"
            >
              {resendStatus === "sending" ? "Sending..." : "Resend verification email"}
            </button>

            <Link
              to="/login"
              className="inline-block w-full rounded-xl bg-[#748779] px-6 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-[#5E7063] cursor-pointer"
            >
              Back to sign in
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-72px)] max-w-7xl items-center justify-center px-4 py-8 sm:px-6 sm:py-12 bg-[#FBFAF7]">
      <section className="w-full max-w-lg rounded-2xl sm:rounded-3xl border border-[#E7E3DC] bg-white p-5 shadow-2xs sm:p-9">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#748779]">
          Customer account
        </p>

        <h1 className="mt-1.5 text-3xl font-bold text-[#20252B]">
          Create an account
        </h1>

        <p className="mt-2 text-sm leading-relaxed text-[#667085]">
          Save addresses, manage orders, create a wishlist and request returns or exchanges.
        </p>

        {/* Google Authentication */}
        <div className="mt-7">
          <GoogleSignInButton
            text="signup_with"
            onSuccess={handleGoogleSuccess}
            onError={(err) => setError(err)}
          />
        </div>

        <div className="relative my-6 flex items-center justify-center">
          <div className="w-full border-t border-[#E7E3DC]"></div>
          <span className="absolute bg-white px-3 text-xs font-bold uppercase tracking-wider text-[#8F9BB3]">
            or
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="registerName" className="text-xs font-bold uppercase tracking-wider text-[#667085]">
              Full name
            </label>

            <input
              id="registerName"
              type="text"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#E7E3DC] bg-white px-4 py-2.5 text-sm text-[#20252B] outline-none transition focus:border-[#748779] focus:ring-1 focus:ring-[#748779]"
              placeholder="e.g. Alex Johnson"
            />
          </div>

          <div>
            <label htmlFor="registerEmail" className="text-xs font-bold uppercase tracking-wider text-[#667085]">
              Email address
            </label>

            <input
              id="registerEmail"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#E7E3DC] bg-white px-4 py-2.5 text-sm text-[#20252B] outline-none transition focus:border-[#748779] focus:ring-1 focus:ring-[#748779]"
              placeholder="name@example.com"
            />
          </div>

          <div>
            <label htmlFor="registerPhone" className="text-xs font-bold uppercase tracking-wider text-[#667085]">
              Phone number
            </label>

            <input
              id="registerPhone"
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#E7E3DC] bg-white px-4 py-2.5 text-sm text-[#20252B] outline-none transition focus:border-[#748779] focus:ring-1 focus:ring-[#748779]"
              placeholder="Optional"
            />
          </div>

          <div>
            <label htmlFor="registerPassword" className="text-xs font-bold uppercase tracking-wider text-[#667085]">
              Password
            </label>

            <input
              id="registerPassword"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#E7E3DC] bg-white px-4 py-2.5 text-sm text-[#20252B] outline-none transition focus:border-[#748779] focus:ring-1 focus:ring-[#748779]"
              placeholder="Minimum 8 characters"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="text-xs font-bold uppercase tracking-wider text-[#667085]">
              Confirm password
            </label>

            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#E7E3DC] bg-white px-4 py-2.5 text-sm text-[#20252B] outline-none transition focus:border-[#748779] focus:ring-1 focus:ring-[#748779]"
              placeholder="Re-enter password"
            />
          </div>

          {error && <p className="rounded-xl bg-[#FEF2F2] border border-[#DC2626]/20 px-4 py-2.5 text-xs font-medium text-[#DC2626]">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-[#748779] px-6 py-3 font-semibold text-white shadow-xs transition hover:bg-[#5E7063] disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer"
          >
            {isLoading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-[#667085]">
          Already registered?{" "}
          <Link to="/login" className="font-semibold text-[#748779] underline hover:text-[#5E7063]">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}

export default RegisterPage;