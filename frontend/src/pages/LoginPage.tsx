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
import type { LoginUserInput } from "../types/auth";

interface LoginLocationState {
  from?: string;
}

function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user, isLoading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoading && user) {
      navigate(user.role === "ADMIN" ? "/admin" : "/account", {
        replace: true,
      });
    }
  }, [isLoading, navigate, user]);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setError("");

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
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Unable to sign in.");
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-72px)] max-w-7xl items-center justify-center px-5 py-12 sm:px-6 bg-[#FBFAF7]">
      <section className="w-full max-w-md rounded-3xl border border-[#E7E3DC] bg-white p-7 shadow-2xs sm:p-9">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#748779]">
          Welcome back
        </p>

        <h1 className="mt-1.5 text-3xl font-bold text-[#20252B]">
          Sign in
        </h1>

        <p className="mt-2 text-sm leading-relaxed text-[#667085]">
          Access your account, orders, addresses and wishlist.
        </p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4.5">
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
            <p className="rounded-xl bg-[#FEF2F2] border border-[#DC2626]/20 px-4 py-2.5 text-xs font-medium text-[#DC2626]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-[#748779] px-6 py-3 font-semibold text-white shadow-xs transition hover:bg-[#5E7063] disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer"
          >
            {isLoading ? "Loading..." : "Sign In"}
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