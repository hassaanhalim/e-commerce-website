import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { authApi } from "../services/auth-api";
import { addressApi } from "../services/checkout-api";
import type {
  AuthUser,
  LoginUserInput,
  RegisterUserInput,
  RegisterResponse,
  MessageResponse,
  SavedAddress,
  BackendAddress,
  CreateAddressInput,
} from "../types/auth";

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (input: LoginUserInput) => Promise<AuthUser>;
  loginWithGoogle: (credential: string) => Promise<AuthUser>;
  register: (input: RegisterUserInput) => Promise<RegisterResponse>;
  verifyEmail: (token: string) => Promise<AuthUser>;
  resendVerification: (email: string) => Promise<MessageResponse>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  updateProfile: (fullName: string, phone: string) => void;
  // Address methods – now backend-backed for authenticated users
  getAddresses: () => SavedAddress[];
  backendAddresses: BackendAddress[];
  isLoadingAddresses: boolean;
  fetchAddresses: () => Promise<void>;
  saveAddress: (address: Omit<SavedAddress, "id"> & { id?: string }) => void;
  deleteAddress: (addressId: string) => void;
  setDefaultAddress: (addressId: string) => void;
}

const PROFILE_CACHE_PREFIX = "shoe-store-user-profile-";
const ADDRESSES_STORAGE_PREFIX = "shoe-store-user-addresses-";

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function profileCacheKey(userId: string) {
  return `${PROFILE_CACHE_PREFIX}${userId}`;
}

function addressesStorageKey(userId: string) {
  return `${ADDRESSES_STORAGE_PREFIX}${userId}`;
}

function readJson<T>(key: string): T | null {
  const saved = localStorage.getItem(key);
  if (!saved) return null;
  try {
    return JSON.parse(saved) as T;
  } catch {
    return null;
  }
}

function writeJson<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}

function mergeCachedProfile(user: AuthUser): AuthUser {
  const cached = readJson<Pick<AuthUser, "fullName" | "phone">>(profileCacheKey(user.id));
  if (!cached) return user;
  return {
    ...user,
    fullName: cached.fullName ?? user.fullName,
    phone: cached.phone ?? user.phone,
  };
}

// Convert BackendAddress to legacy SavedAddress for backward-compat
function backendToSavedAddress(addr: BackendAddress): SavedAddress {
  return {
    id: addr.id,
    fullName: addr.recipientName,
    phone: addr.phone,
    addressLine1: addr.addressLine1,
    addressLine2: addr.addressLine2 ?? undefined,
    city: addr.city,
    province: addr.stateOrProvince ?? "",
    postalCode: addr.postalCode ?? undefined,
    isDefault: addr.isDefault,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [backendAddresses, setBackendAddresses] = useState<BackendAddress[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);

  const setAuthenticatedUser = useCallback((nextUser: AuthUser | null) => {
    if (!nextUser) {
      setUser(null);
      setBackendAddresses([]);
      return;
    }

    const merged = mergeCachedProfile(nextUser);
    setUser(merged);
    writeJson(profileCacheKey(merged.id), {
      fullName: merged.fullName,
      phone: merged.phone,
    });
  }, []);

  // Bootstrap session
  useEffect(() => {
    let active = true;

    async function bootstrapSession() {
      try {
        const currentUser = await authApi.me();
        if (active) {
          setAuthenticatedUser(currentUser);
        }
      } catch {
        if (active) {
          setUser(null);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    void bootstrapSession();

    return () => {
      active = false;
    };
  }, [setAuthenticatedUser]);

  // Fetch addresses when user changes
  const fetchAddresses = useCallback(async () => {
    if (!user) {
      setBackendAddresses([]);
      return;
    }
    setIsLoadingAddresses(true);
    try {
      const addrs = await addressApi.getAddresses();
      setBackendAddresses(addrs);
    } catch {
      setBackendAddresses([]);
    } finally {
      setIsLoadingAddresses(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      void fetchAddresses();
    } else {
      setBackendAddresses([]);
    }
  }, [user, fetchAddresses]);

  const login = useCallback(
    async (input: LoginUserInput) => {
      const authenticatedUser = await authApi.login(input);
      setAuthenticatedUser(authenticatedUser);
      return authenticatedUser;
    },
    [setAuthenticatedUser],
  );

  const loginWithGoogle = useCallback(
    async (credential: string) => {
      const authenticatedUser = await authApi.loginWithGoogle(credential);
      setAuthenticatedUser(authenticatedUser);
      return authenticatedUser;
    },
    [setAuthenticatedUser],
  );

  const register = useCallback(
    async (input: RegisterUserInput) => {
      return authApi.register(input);
    },
    [],
  );

  const verifyEmail = useCallback(
    async (token: string) => {
      const authenticatedUser = await authApi.verifyEmail(token);
      setAuthenticatedUser(authenticatedUser);
      return authenticatedUser;
    },
    [setAuthenticatedUser],
  );

  const resendVerification = useCallback(
    async (email: string) => {
      return authApi.resendVerification(email);
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      setBackendAddresses([]);
    }
  }, []);

  const logoutAll = useCallback(async () => {
    try {
      await authApi.logoutAll();
    } finally {
      setUser(null);
      setBackendAddresses([]);
    }
  }, []);

  const updateProfile = useCallback((fullName: string, phone: string) => {
    setUser((current) => {
      if (!current) return current;
      const updated = {
        ...current,
        fullName: fullName.trim(),
        phone: phone.trim() || null,
      };
      writeJson(profileCacheKey(current.id), {
        fullName: updated.fullName,
        phone: updated.phone,
      });
      return updated;
    });
  }, []);

  // ── Legacy address methods (fallback to localStorage for backward compat) ──
  const getAddresses = useCallback(() => {
    // Return backend addresses if available, otherwise fall back to localStorage
    if (backendAddresses.length > 0) {
      return backendAddresses.map(backendToSavedAddress);
    }
    if (!user) return [];
    return readJson<SavedAddress[]>(addressesStorageKey(user.id)) ?? [];
  }, [user, backendAddresses]);

  // saveAddress now calls the backend if authenticated
  const saveAddress = useCallback(
    (address: Omit<SavedAddress, "id"> & { id?: string }) => {
      if (!user) return;

      const isNew = !address.id;
      const input: CreateAddressInput = {
        recipientName: address.fullName,
        phone: address.phone,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city: address.city,
        stateOrProvince: address.province,
        postalCode: address.postalCode,
        country: "Pakistan",
        isDefault: address.isDefault,
      };

      if (isNew) {
        addressApi
          .createAddress(input)
          .then((created) => {
            setBackendAddresses((prev) => {
              if (created.isDefault) {
                return [...prev.map((a) => ({ ...a, isDefault: false })), created];
              }
              return [...prev, created];
            });
          })
          .catch(() => {
            // Fallback to localStorage on error
            const storageKey = addressesStorageKey(user.id);
            const saved = readJson<SavedAddress[]>(storageKey) ?? [];
            const id = `addr-${crypto.randomUUID()}`;
            const normalized: SavedAddress = { ...address, id };
            if (normalized.isDefault || saved.length === 0) {
              normalized.isDefault = true;
            }
            writeJson(storageKey, [...saved.map((e) => ({ ...e, isDefault: false })), normalized]);
          });
      } else {
        const { id, ...rest } = address as SavedAddress;
        addressApi
          .updateAddress(id, {
            recipientName: rest.fullName,
            phone: rest.phone,
            addressLine1: rest.addressLine1,
            addressLine2: rest.addressLine2,
            city: rest.city,
            stateOrProvince: rest.province,
            postalCode: rest.postalCode,
            country: "Pakistan",
            isDefault: rest.isDefault,
          })
          .then((updated) => {
            setBackendAddresses((prev) =>
              prev.map((a) => (a.id === updated.id ? updated : a)),
            );
          })
          .catch(() => {});
      }
    },
    [user],
  );

  const deleteAddress = useCallback(
    (addressId: string) => {
      if (!user) return;
      addressApi
        .deleteAddress(addressId)
        .then(() => {
          setBackendAddresses((prev) => {
            const removed = prev.find((a) => a.id === addressId);
            const remaining = prev.filter((a) => a.id !== addressId);
            if (removed?.isDefault && remaining.length > 0) {
              remaining[0] = { ...remaining[0], isDefault: true };
            }
            return remaining;
          });
        })
        .catch(() => {});
    },
    [user],
  );

  const setDefaultAddress = useCallback(
    (addressId: string) => {
      if (!user) return;
      addressApi
        .setDefault(addressId)
        .then(() => {
          setBackendAddresses((prev) =>
            prev.map((a) => ({ ...a, isDefault: a.id === addressId })),
          );
        })
        .catch(() => {});
    },
    [user],
  );

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      login,
      loginWithGoogle,
      register,
      verifyEmail,
      resendVerification,
      logout,
      logoutAll,
      updateProfile,
      getAddresses,
      backendAddresses,
      isLoadingAddresses,
      fetchAddresses,
      saveAddress,
      deleteAddress,
      setDefaultAddress,
    }),
    [
      user,
      isLoading,
      login,
      loginWithGoogle,
      register,
      verifyEmail,
      resendVerification,
      logout,
      logoutAll,
      updateProfile,
      getAddresses,
      backendAddresses,
      isLoadingAddresses,
      fetchAddresses,
      saveAddress,
      deleteAddress,
      setDefaultAddress,
    ],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }
  return context;
}