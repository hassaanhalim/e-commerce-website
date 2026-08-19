import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { wishlistApi, type BackendWishlistProduct } from "../services/wishlist-api";

const GUEST_KEY = "shoe-store-guest-wishlist";

function getSavedGuestWishlist(): string[] {
  const saved = localStorage.getItem(GUEST_KEY);
  if (!saved) return [];
  try {
    return JSON.parse(saved) as string[];
  } catch {
    return [];
  }
}

interface WishlistContextValue {
  // Authenticated: full product objects; guest: just product IDs
  wishlistItems: string[];
  wishlistProducts: BackendWishlistProduct[];
  wishlistCount: number;
  isLoadingWishlist: boolean;
  isInWishlist: (productId: string) => boolean;
  toggleWishlist: (productId: string) => Promise<void>;
  removeFromWishlist: (productId: string) => Promise<void>;
  clearWishlist: () => Promise<void>;
  refreshWishlist: () => Promise<void>;
}

const WishlistContext = createContext<WishlistContextValue | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const isAuthenticated = Boolean(user);

  const [guestIds, setGuestIds] = useState<string[]>(getSavedGuestWishlist);
  const [backendProducts, setBackendProducts] = useState<BackendWishlistProduct[]>([]);
  const [isLoadingWishlist, setIsLoadingWishlist] = useState(false);
  const mergedRef = useRef(false);

  // Persist guest wishlist
  useEffect(() => {
    if (!isAuthenticated) {
      localStorage.setItem(GUEST_KEY, JSON.stringify(guestIds));
    }
  }, [guestIds, isAuthenticated]);

  const refreshWishlist = useCallback(async () => {
    if (!user) return;
    setIsLoadingWishlist(true);
    try {
      const result = await wishlistApi.getWishlist();
      setBackendProducts(result.products ?? []);
    } catch {
      setBackendProducts([]);
    } finally {
      setIsLoadingWishlist(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setBackendProducts([]);
      mergedRef.current = false;
      return;
    }

    const doMergeAndLoad = async () => {
      setIsLoadingWishlist(true);
      try {
        const guestWishlist = getSavedGuestWishlist();

        if (guestWishlist.length > 0 && !mergedRef.current) {
          mergedRef.current = true;
          const result = await wishlistApi.mergeWishlist(guestWishlist);
          setBackendProducts(result.products ?? []);
          localStorage.removeItem(GUEST_KEY);
          setGuestIds([]);
        } else {
          const result = await wishlistApi.getWishlist();
          setBackendProducts(result.products ?? []);
        }
      } catch {
        try {
          const result = await wishlistApi.getWishlist();
          setBackendProducts(result.products ?? []);
        } catch {
          setBackendProducts([]);
        }
      } finally {
        setIsLoadingWishlist(false);
      }
    };

    void doMergeAndLoad();
  }, [user, authLoading]);

  // Derived list of IDs (unified for isInWishlist)
  const wishlistItems: string[] = isAuthenticated
    ? backendProducts.map((p) => p.id)
    : guestIds;

  const isInWishlist = useCallback(
    (productId: string) => wishlistItems.includes(String(productId)),
    [wishlistItems],
  );

  const toggleWishlist = useCallback(
    async (productId: string) => {
      if (isAuthenticated) {
        const alreadyIn = backendProducts.some((p) => p.id === productId);
        if (alreadyIn) {
          await wishlistApi.removeItem(productId);
          setBackendProducts((prev) => prev.filter((p) => p.id !== productId));
        } else {
          try {
            const result = await wishlistApi.addItem(productId);
            setBackendProducts(result.products ?? []);
          } catch {
            // ignore – e.g. inactive product
          }
        }
      } else {
        setGuestIds((prev) => {
          const id = String(productId);
          return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
        });
      }
    },
    [isAuthenticated, backendProducts],
  );

  const removeFromWishlist = useCallback(
    async (productId: string) => {
      if (isAuthenticated) {
        await wishlistApi.removeItem(productId);
        setBackendProducts((prev) => prev.filter((p) => p.id !== productId));
      } else {
        setGuestIds((prev) => prev.filter((id) => id !== String(productId)));
      }
    },
    [isAuthenticated],
  );

  const clearWishlist = useCallback(async () => {
    if (isAuthenticated) {
      await wishlistApi.clearWishlist();
      setBackendProducts([]);
    } else {
      setGuestIds([]);
      localStorage.removeItem(GUEST_KEY);
    }
  }, [isAuthenticated]);

  return (
    <WishlistContext.Provider
      value={{
        wishlistItems,
        wishlistProducts: isAuthenticated ? backendProducts : [],
        wishlistCount: wishlistItems.length,
        isLoadingWishlist,
        isInWishlist,
        toggleWishlist,
        removeFromWishlist,
        clearWishlist,
        refreshWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used inside WishlistProvider.");
  }
  return context;
}
