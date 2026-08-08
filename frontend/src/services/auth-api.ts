import { apiRequest } from "./api";
import type { AuthUser, LoginUserInput, RegisterUserInput } from "../types/auth";

export const authApi = {
  me: () => apiRequest<AuthUser>("/auth/me", { method: "GET" }),
  register: (input: RegisterUserInput) =>
    apiRequest<AuthUser>("/auth/register", {
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