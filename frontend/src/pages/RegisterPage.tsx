import {
  useEffect,
  useState,
  type FormEvent,
} from "react";
import {
  Link,
  useNavigate,
} from "react-router";
import { useAuth } from "../context/AuthContext";
import type { RegisterUserInput } from "../types/auth";

function RegisterPage() {
  const navigate = useNavigate();
  const { register, user, isLoading } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

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
      await register({
        fullName,
        email,
        password,
        phone: phone.trim() || undefined,
      } satisfies RegisterUserInput);

      navigate("/account", { replace: true });
    } catch (registerError) {
      setError(registerError instanceof Error ? registerError.message : "Unable to create the account.");
    }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-72px)] max-w-7xl items-center justify-center px-5 py-12 sm:px-6 bg-[#FBFAF7]">
      <section className="w-full max-w-lg rounded-3xl border border-[#E7E3DC] bg-white p-7 shadow-2xs sm:p-9">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#748779]">
          Customer account
        </p>

        <h1 className="mt-1.5 text-3xl font-bold text-[#20252B]">
          Create an account
        </h1>

        <p className="mt-2 text-sm leading-relaxed text-[#667085]">
          Save addresses, manage orders, create a wishlist and request returns or exchanges.
        </p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
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
            />
          </div>

          {error && <p className="rounded-xl bg-[#FEF2F2] border border-[#DC2626]/20 px-4 py-2.5 text-xs font-medium text-[#DC2626]">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-[#748779] px-6 py-3 font-semibold text-white shadow-xs transition hover:bg-[#5E7063] disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer"
          >
            {isLoading ? "Loading..." : "Create Account"}
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