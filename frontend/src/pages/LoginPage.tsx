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
import type { LoginUserInput } from "../types/auth";

interface LoginLocationState {
  from?: string;
}

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle, resendVerification, user, isLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isUnverified, setIsUnverified] = useState(false);
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
    setIsUnverified(false);
    setResendStatus("idle");

    if (!email.trim() || !password) {
      setError("Email address and password are required.");
      return;
    }

    try {
      const authenticatedUser = await login({
        email,
        password,
      } satisfies LoginUserInput);

      const locationState = location.state as LoginLocationState | null;

      if (locationState?.from) {
        navigate(locationState.from, {
          replace: true,
        });
        return;
      }

      navigate(authenticatedUser.role === "ADMIN" ? "/admin" : "/account", {
        replace: true,
      });
    } catch (loginError: any) {
      const message = loginError instanceof Error ? loginError.message : "Unable to sign in.";
      const isNotVerified =
        message.toLowerCase().includes("verify your email") ||
        loginError?.code === "EMAIL_NOT_VERIFIED" ||
        loginError?.response?.code === "EMAIL_NOT_VERIFIED";

      if (isNotVerified) {
        setIsUnverified(true);
        setError("Please verify your email address before signing in.");
      } else {
        setError(message);
      }
    }
  }

  async function handleGoogleSuccess(credential: string) {
    setError("");
    setIsUnverified(false);
    try {
      const authenticatedUser = await loginWithGoogle(credential);
      const locationState = location.state as LoginLocationState | null;

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
          : "Google sign-in could not be completed.",
      );
    }
  }

  async function handleResendVerification() {
    if (!email.trim()) {
      setError("Please enter your email address above to receive a verification link.");
      return;
    }

    setResendStatus("sending");
    try {
      const result = await resendVerification(email.trim());
      setResendStatus("sent");
      setResendMessage(result.message || "A new verification link has been sent to your email.");
    } catch (err: any) {
      setResendStatus("idle");
      setError(
        err instanceof Error ? err.message : "Failed to send verification email. Please try again.",
      );
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-72px)] max-w-7xl items-center justify-center px-4 py-8 sm:px-6 sm:py-12 bg-[#FBFAF7]">
      <section className="w-full max-w-md rounded-2xl sm:rounded-3xl border border-[#E7E3DC] bg-white p-5 shadow-2xs sm:p-9">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#748779]">
          Welcome back
        </p>

        <h1 className="mt-1.5 text-3xl font-bold text-[#20252B]">
          Sign in
        </h1>

        <p className="mt-2 text-sm leading-relaxed text-[#667085]">
          Access your account, orders, addresses and wishlist.
        </p>

        {/* Google Authentication */}
        <div className="mt-7">
          <GoogleSignInButton
            text="continue_with"
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

        <form onSubmit={handleSubmit} className="space-y-4.5">
          <div>
            <label htmlFor="loginEmail" className="text-xs font-bold uppercase tracking-wider text-[#667085]">
              Email address
            </label>

            <input
              id="loginEmail"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#E7E3DC] bg-white px-4 py-2.5 text-sm text-[#20252B] outline-none transition focus:border-[#748779] focus:ring-1 focus:ring-[#748779] placeholder:text-[#667085]"
              placeholder="name@example.com"
            />
          </div>

          <div>
            <label htmlFor="loginPassword" className="text-xs font-bold uppercase tracking-wider text-[#667085]">
              Password
            </label>

            <input
              id="loginPassword"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-[#E7E3DC] bg-white px-4 py-2.5 text-sm text-[#20252B] outline-none transition focus:border-[#748779] focus:ring-1 focus:ring-[#748779] placeholder:text-[#667085]"
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <div className="rounded-xl bg-[#FEF2F2] border border-[#DC2626]/20 p-3.5 text-xs text-[#DC2626]">
              <p className="font-medium">{error}</p>
              {isUnverified && (
                <div className="mt-2.5 pt-2 border-t border-[#DC2626]/15 flex items-center justify-between">
                  <span className="text-[11px] text-[#20252B]">Didn't receive the email?</span>
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={resendStatus === "sending"}
                    className="font-bold text-[#748779] hover:underline cursor-pointer disabled:opacity-50"
                  >
                    {resendStatus === "sending" ? "Sending..." : "Resend verification email"}
                  </button>
                </div>
              )}
            </div>
          )}

          {resendStatus === "sent" && (
            <p className="rounded-xl bg-[#E5EAE6] border border-[#748779]/30 p-3 text-xs font-medium text-[#748779]">
              {resendMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-[#748779] px-6 py-3 font-semibold text-white shadow-xs transition hover:bg-[#5E7063] disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer"
          >
            {isLoading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-[#667085]">
          Do not have an account?{" "}
          <Link to="/register" className="font-semibold text-[#748779] underline hover:text-[#5E7063]">
            Create one
          </Link>
        </p>
      </section>
    </main>
  );
}

export default LoginPage;