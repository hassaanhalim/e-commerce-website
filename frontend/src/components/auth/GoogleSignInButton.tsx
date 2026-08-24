import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string; select_by?: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: "standard" | "icon";
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
              shape?: "rectangular" | "pill" | "circle" | "square";
              logo_alignment?: "left" | "center";
              width?: number | string;
              locale?: string;
            },
          ) => void;
          prompt?: () => void;
        };
      };
    };
  }
}

interface GoogleSignInButtonProps {
  onSuccess: (credential: string) => void;
  onError?: (error: string) => void;
  text?: "continue_with" | "signin_with" | "signup_with";
  disabled?: boolean;
}

export function GoogleSignInButton({
  onSuccess,
  onError,
  text = "continue_with",
  disabled = false,
}: GoogleSignInButtonProps) {
  const buttonContainerRef = useRef<HTMLDivElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const clientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim();

  useEffect(() => {
    if (!clientId) {
      return;
    }

    if (window.google?.accounts?.id) {
      setScriptLoaded(true);
      return;
    }

    const existingScript = document.getElementById("google-gsi-script");
    if (existingScript) {
      existingScript.addEventListener("load", () => setScriptLoaded(true));
      return;
    }

    const script = document.createElement("script");
    script.id = "google-gsi-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptLoaded(true);
    script.onerror = () => {
      if (onError) onError("Failed to load Google identity services.");
    };
    document.head.appendChild(script);
  }, [clientId, onError]);

  useEffect(() => {
    if (!scriptLoaded || !clientId || !buttonContainerRef.current || !window.google?.accounts?.id) {
      return;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response) => {
          if (response.credential) {
            onSuccess(response.credential);
          } else if (onError) {
            onError("Google sign-in was cancelled or returned no credential.");
          }
        },
      });

      // Clear previous buttons
      buttonContainerRef.current.innerHTML = "";

      window.google.accounts.id.renderButton(buttonContainerRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        text,
        shape: "rectangular",
        logo_alignment: "left",
        width: "100%",
      });
    } catch {
      if (onError) onError("Google Sign-In initialization failed.");
    }
  }, [scriptLoaded, clientId, text, onSuccess, onError]);

  // Fallback / Placeholder when client ID is not yet configured or script is loading
  if (!clientId) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (onError) {
            onError(
              "Google Sign-In is not configured. Please provide VITE_GOOGLE_CLIENT_ID in your environment.",
            );
          }
        }}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#E7E3DC] bg-white px-4 py-2.5 text-sm font-semibold text-[#20252B] shadow-2xs transition hover:bg-[#F7F5F1] disabled:opacity-50 cursor-pointer"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
          />
          <path
            fill="#FBBC05"
            d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
          />
          <path
            fill="#EA4335"
            d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
          />
        </svg>
        <span>Continue with Google</span>
      </button>
    );
  }

  return (
    <div className="w-full flex justify-center min-h-[44px]">
      <div
        ref={buttonContainerRef}
        className="w-full flex justify-center [&>div]:w-full [&>iframe]:!w-full [&>div]:!max-w-full"
      />
    </div>
  );
}
