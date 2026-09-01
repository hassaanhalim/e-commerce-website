import { apiRequest } from "./api";
import type {
  AuthUser,
  LoginUserInput,
  MessageResponse,
  RegisterResponse,
  RegisterUserInput,
} from "../types/auth";

export const authApi = {
  me: () => apiRequest<AuthUser>("/auth/me", { method: "GET" }),

  register: (input: RegisterUserInput) =>
    apiRequest<RegisterResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
      retryOnUnauthorized: false,
    }),

  login: (input: LoginUserInput) =>
    apiRequest<AuthUser>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
      retryOnUnauthorized: false,
    }),

  loginWithGoogle: (credential: string) =>
    apiRequest<AuthUser>("/auth/google", {
      method: "POST",
      body: JSON.stringify({ credential }),
      retryOnUnauthorized: false,
    }),

  verifyEmail: (token: string) =>
    apiRequest<AuthUser>("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
      retryOnUnauthorized: false,
    }),

  resendVerification: (email: string) =>
    apiRequest<MessageResponse>("/auth/resend-verification", {
      method: "POST",
      body: JSON.stringify({ email }),
      retryOnUnauthorized: false,
    }),

  refresh: () =>
    apiRequest<AuthUser>("/auth/refresh", {
      method: "POST",
      retryOnUnauthorized: false,
    }),

  logout: () =>
    apiRequest<void>("/auth/logout", {
      method: "POST",
      retryOnUnauthorized: false,
    }),

  logoutAll: () =>
    apiRequest<{ success: boolean }>("/auth/logout-all", {
      method: "POST",
    }),
};