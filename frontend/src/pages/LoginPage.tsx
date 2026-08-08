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
    <main className="mx-auto flex min-h-[calc(100vh-72px)] max-w-7xl items-center justify-center px-5 py-12 sm:px-6">
      <section className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-7 shadow-sm sm:p-9">
        <p className="text-sm font-semibold uppercase tracking-wider text-gray-500">
          Welcome back
        </p>

        <h1 className="mt-2 text-3xl font-bold text-gray-950">
          Sign in
        </h1>

        <p className="mt-3 text-sm leading-6 text-gray-600">
          Access your account, orders, addresses and wishlist.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div>
            <label htmlFor="loginEmail" className="text-sm font-medium text-gray-900">
              Email address
            </label>

            <input
              id="loginEmail"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-black focus:ring-1 focus:ring-black"
              placeholder="name@example.com"
            />
          </div>

          <div>
            <label htmlFor="loginPassword" className="text-sm font-medium text-gray-900">
              Password
            </label>

            <input
              id="loginPassword"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-black focus:ring-1 focus:ring-black"
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-black px-6 py-3.5 font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isLoading ? "Loading..." : "Sign In"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Do not have an account?{" "}
          <Link to="/register" className="font-semibold text-black underline">
            Create one
          </Link>
        </p>
      </section>
    </main>
  );
}

export default LoginPage;