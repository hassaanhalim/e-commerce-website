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
import { cartApi } from "../services/cart-api";
import type { BackendCart, BackendCartItem, CartItem, AddCartItem } from "../types/cart";

// ── Guest localStorage key ───────────────────────────────────────────────────
const GUEST_CART_KEY = "shoe-store-cart";

function getSavedGuestCart(): CartItem[] {
  const saved = localStorage.getItem(GUEST_CART_KEY);
  if (!saved) return [];
  try {
    const parsed: unknown = JSON.parse(saved);
    return Array.isArray(parsed) ? (parsed as CartItem[]) : [];
  } catch {
    return [];
  }
}

function saveGuestCart(items: CartItem[]) {
  localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
}

function clearGuestCart() {
  localStorage.removeItem(GUEST_CART_KEY);
}

// ── Context interface ────────────────────────────────────────────────────────
interface CartContextValue {
  // Unified data
  cartItems: CartItem[];
  cartCount: number;
  cartSubtotal: number;
  // Backend cart (authenticated only)
  backendCart: BackendCart | null;
  isLoadingCart: boolean;
  // Actions
  addToCart: (item: AddCartItem, quantity?: number) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeFromCart: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

// ── Converter: BackendCartItem → CartItem ────────────────────────────────────
function backendItemToCartItem(item: BackendCartItem): CartItem {
  return {
    id: item.itemId,
    productId: item.productId,
    name: item.productName,
    image: item.productImage,
    price: item.unitPrice,
    size: item.size,
    color: item.color,
    quantity: item.quantity,
    stock: item.availableQuantity,
    variantId: item.variantId,
    itemId: item.itemId,
    availableQuantity: item.availableQuantity,
  };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const isAuthenticated = Boolean(user);

  // ── State ────────────────────────────────────────────────────────────────
  const [guestItems, setGuestItems] = useState<CartItem[]>(getSavedGuestCart);
  const [backendCart, setBackendCart] = useState<BackendCart | null>(null);
  const [isLoadingCart, setIsLoadingCart] = useState(false);
  const mergedRef = useRef(false);

  // ── Persist guest cart ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) {
      saveGuestCart(guestItems);
    }
  }, [guestItems, isAuthenticated]);

  // ── Fetch backend cart + merge guest cart on login ───────────────────────
  const refreshCart = useCallback(async () => {
    if (!user) return;
    setIsLoadingCart(true);
    try {
      const cart = await cartApi.getCart();
      setBackendCart(cart);
    } catch {
      setBackendCart(null);
    } finally {
      setIsLoadingCart(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      // User logged out – clear backend cart state
      setBackendCart(null);
      mergedRef.current = false;
      return;
    }

    const doMergeAndLoad = async () => {
      setIsLoadingCart(true);
      try {
        const guestCart = getSavedGuestCart();

        if (guestCart.length > 0 && !mergedRef.current) {
          mergedRef.current = true;
          // Build merge payload – only items that have variantId
          const mergeItems = guestCart
            .filter((item) => item.variantId)
            .map((item) => ({ variantId: item.variantId!, quantity: item.quantity }));

          const guestOnlyItems = guestCart.filter((item) => !item.variantId);
          const allMergeItems = [
            ...mergeItems,
            ...guestOnlyItems.map((item) => ({
              variantId: `${item.productId}-guest-${item.size}-${item.color}`,
              quantity: item.quantity,
            })),
          ].filter((x) => x.variantId && !x.variantId.includes("-guest-"));

          if (allMergeItems.length > 0) {
            const merged = await cartApi.mergeCart(allMergeItems);
            setBackendCart(merged);
          } else {
            const cart = await cartApi.getCart();
            setBackendCart(cart);
          }
          // Clear guest cart after successful merge
          clearGuestCart();
          setGuestItems([]);
        } else {
          const cart = await cartApi.getCart();
          setBackendCart(cart);
        }
      } catch {
        // Still try to load cart even if merge fails
        try {
          const cart = await cartApi.getCart();
          setBackendCart(cart);
        } catch {
          setBackendCart(null);
        }
      } finally {
        setIsLoadingCart(false);
      }
    };

    void doMergeAndLoad();
  }, [user, authLoading]);

  // ── Derived unified cart ─────────────────────────────────────────────────
  const cartItems: CartItem[] = isAuthenticated
    ? (backendCart?.items ?? []).map(backendItemToCartItem)
    : guestItems;

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = isAuthenticated
    ? (backendCart?.subtotal ?? 0)
    : cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // ── Actions ──────────────────────────────────────────────────────────────
  const addToCart = useCallback(
    async (item: AddCartItem, quantity: number = 1) => {
      const addQty = Math.max(1, quantity);
      if (isAuthenticated && item.variantId) {
        // Use backend
        try {
          const updatedCart = await cartApi.addItem(
            item.variantId,
            addQty,
            item.productId,
          );
          setBackendCart(updatedCart);
        } catch (err) {
          throw err;
        }
      } else {
        // Guest localStorage
        const itemId = `${item.productId}-${item.size}-${item.color}`;
        setGuestItems((current) => {
          const existing = current.find((ci) => ci.id === itemId);
          if (existing) {
            return current.map((ci) =>
              ci.id === itemId
                ? { ...ci, quantity: Math.min(ci.quantity + addQty, ci.stock) }
                : ci,
            );
          }
          return [...current, { ...item, id: itemId, quantity: addQty }];
        });
      }
    },
    [isAuthenticated],
  );

  const updateQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      if (isAuthenticated) {
        try {
          await cartApi.updateItem(itemId, quantity);
          await refreshCart();
        } catch (err) {
          throw err;
        }
      } else {
        setGuestItems((current) =>
          current.map((ci) =>
            ci.id === itemId
              ? { ...ci, quantity: Math.max(1, Math.min(quantity, ci.stock)) }
              : ci,
          ),
        );
      }
    },
    [isAuthenticated, refreshCart],
  );

  const removeFromCart = useCallback(
    async (itemId: string) => {
      if (isAuthenticated) {
        try {
          await cartApi.removeItem(itemId);
          setBackendCart((prev) =>
            prev
              ? {
                  ...prev,
                  items: (prev.items ?? []).filter((i) => i.itemId !== itemId),
                  itemCount: prev.itemCount - ((prev.items ?? []).find((i) => i.itemId === itemId)?.quantity ?? 0),
                }
              : prev,
          );
          // Full refresh to get accurate subtotal
          await refreshCart();
        } catch (err) {
          throw err;
        }
      } else {
        setGuestItems((current) => current.filter((ci) => ci.id !== itemId));
      }
    },
    [isAuthenticated, refreshCart],
  );

  const clearCart = useCallback(async () => {
    if (isAuthenticated) {
      try {
        await cartApi.clearCart();
        setBackendCart((prev) =>
          prev ? { ...prev, items: [], itemCount: 0, subtotal: 0 } : prev,
        );
      } catch (err) {
        throw err;
      }
    } else {
      setGuestItems([]);
      clearGuestCart();
    }
  }, [isAuthenticated]);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        cartCount,
        cartSubtotal,
        backendCart,
        isLoadingCart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside a CartProvider");
  }
  return context;
}

// Export the guest cart key for external use
export { GUEST_CART_KEY };