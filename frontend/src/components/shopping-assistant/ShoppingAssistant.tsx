import { useState, useEffect, useRef, type FormEvent, type KeyboardEvent } from "react";
import {
  type ChatMessage,
  type PendingQuestion,
  type ShoppingAssistantStorageData,
  type ShoppingPreferences,
  SHOPPING_ASSISTANT_STORAGE_KEY,
  INITIAL_ASSISTANT_MESSAGE,
  SUGGESTION_CHIPS,
  FALLBACK_ASSISTANT_ERROR,
} from "./types";
import {
  ShoppingAssistantMessage,
  ShoppingAssistantTypingIndicator,
} from "./ShoppingAssistantMessage";
import { shoppingAssistantApi } from "../../services/shopping-assistant-api";
import { useAuth } from "../../context/AuthContext";

/* Safe session storage loader for guests */
function loadSessionState(): {
  messages: ChatMessage[];
  isOpen: boolean;
  preferences: ShoppingPreferences | null;
  pendingQuestion: PendingQuestion | null;
  readyForRecommendations: boolean;
} {
  try {
    const raw = sessionStorage.getItem(SHOPPING_ASSISTANT_STORAGE_KEY);
    if (!raw) {
      return {
        messages: [INITIAL_ASSISTANT_MESSAGE],
        isOpen: false,
        preferences: null,
        pendingQuestion: null,
        readyForRecommendations: false,
      };
    }
    const data: ShoppingAssistantStorageData = JSON.parse(raw);
    const validMessages =
      Array.isArray(data.messages) &&
      data.messages.length > 0 &&
      data.messages.every(
        (m) =>
          typeof m?.id === "string" &&
          (m?.role === "user" || m?.role === "assistant") &&
          typeof m?.content === "string" &&
          typeof m?.timestamp === "number",
      );

    return {
      messages: validMessages ? data.messages : [INITIAL_ASSISTANT_MESSAGE],
      isOpen: typeof data.isOpen === "boolean" ? data.isOpen : false,
      preferences: data.preferences || null,
      pendingQuestion: data.pendingQuestion || null,
      readyForRecommendations: Boolean(data.readyForRecommendations),
    };
  } catch {
    return {
      messages: [INITIAL_ASSISTANT_MESSAGE],
      isOpen: false,
      preferences: null,
      pendingQuestion: null,
      readyForRecommendations: false,
    };
  }
}

/* Safe session storage saver for guests */
function saveSessionState(
  messages: ChatMessage[],
  isOpen: boolean,
  preferences: ShoppingPreferences | null,
  pendingQuestion: PendingQuestion | null,
  readyForRecommendations: boolean,
): void {
  try {
    const data: ShoppingAssistantStorageData = {
      version: 3,
      messages,
      isOpen,
      preferences,
      pendingQuestion,
      readyForRecommendations,
    };
    sessionStorage.setItem(SHOPPING_ASSISTANT_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Gracefully handle storage quota or private browsing exceptions
  }
}

/* ─────────────────────────────────────────────
   Inline SVG Icons
   ───────────────────────────────────────────── */
function IconChatBubble({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  );
}

function IconClose({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function IconTrash({ className = "h-4.5 w-4.5" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  );
}

function IconSend({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

function IconSparkle({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
      />
    </svg>
  );
}

export function ShoppingAssistant() {
  const { user, isLoading: isAuthLoading } = useAuth();

  const [initialState] = useState(loadSessionState);
  const [isOpen, setIsOpen] = useState(initialState.isOpen);
  const [messages, setMessages] = useState<ChatMessage[]>(initialState.messages);
  const [preferences, setPreferences] = useState<ShoppingPreferences | null>(
    initialState.preferences || null,
  );
  const [pendingQuestion, setPendingQuestion] = useState<PendingQuestion | null>(
    initialState.pendingQuestion || null,
  );
  const [readyForRecommendations, setReadyForRecommendations] = useState<boolean>(
    initialState.readyForRecommendations || false,
  );
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [headerBottom, setHeaderBottom] = useState(65);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Authenticated vs Guest history synchronization
  useEffect(() => {
    let isMounted = true;
    if (isAuthLoading) return;

    if (user) {
      // Authenticated customer: fetch latest history from Supabase
      shoppingAssistantApi
        .getLatestHistory()
        .then((res) => {
          if (!isMounted) return;
          if (res.conversationId && res.messages.length > 0) {
            setConversationId(res.conversationId);
            setMessages(res.messages);
            if (res.preferences) setPreferences(res.preferences);
            if (res.pendingQuestion) setPendingQuestion(res.pendingQuestion);
          } else {
            setConversationId(res.conversationId || null);
            setMessages([
              {
                ...INITIAL_ASSISTANT_MESSAGE,
                timestamp: Date.now(),
              },
            ]);
            setPreferences(null);
            setPendingQuestion(null);
          }
        })
        .catch((err) => {
          if (!isMounted) return;
          console.error("Failed to fetch shopping assistant history:", err);
          setMessages([INITIAL_ASSISTANT_MESSAGE]);
        });
    } else {
      // Guest customer: load from sessionStorage
      const guestState = loadSessionState();
      setConversationId(null);
      setMessages(guestState.messages);
      setPreferences(guestState.preferences);
      setPendingQuestion(guestState.pendingQuestion);
      setReadyForRecommendations(guestState.readyForRecommendations);
    }

    return () => {
      isMounted = false;
    };
  }, [user?.id, isAuthLoading]);

  // Dynamically track the header/navbar bottom position to guarantee panel stays below it
  useEffect(() => {
    const updateHeaderBottom = () => {
      const headerEl = document.querySelector("header");
      if (headerEl) {
        const rect = headerEl.getBoundingClientRect();
        setHeaderBottom(Math.max(65, rect.bottom));
      }
    };

    updateHeaderBottom();

    const headerEl = document.querySelector("header");
    let resizeObserver: ResizeObserver | null = null;

    if (headerEl && typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => {
        updateHeaderBottom();
      });
      resizeObserver.observe(headerEl);
    }

    window.addEventListener("scroll", updateHeaderBottom, { passive: true });
    window.addEventListener("resize", updateHeaderBottom);

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener("scroll", updateHeaderBottom);
      window.removeEventListener("resize", updateHeaderBottom);
    };
  }, []);

  // Sync to session storage for guests
  useEffect(() => {
    if (!user) {
      saveSessionState(messages, isOpen, preferences, pendingQuestion, readyForRecommendations);
    }
  }, [messages, isOpen, preferences, pendingQuestion, readyForRecommendations, user]);

  // Smooth scroll to latest message inside widget container
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping, isOpen]);

  // Focus textarea when panel is opened
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        textareaRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        if (showClearConfirm) {
          setShowClearConfirm(false);
        } else {
          setIsOpen(false);
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, showClearConfirm]);

  const handleSendMessage = async (textToSend?: string) => {
    const content = (textToSend !== undefined ? textToSend : input).trim();
    if (!content || isTyping) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      role: "user",
      content,
      timestamp: Date.now(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsTyping(true);

    try {
      const response = await shoppingAssistantApi.sendChat(
        content,
        updatedMessages,
        conversationId,
        preferences,
        pendingQuestion,
      );

      if (response.conversationId) {
        setConversationId(response.conversationId);
      }

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        role: "assistant",
        content:
          response.message ||
          "How can I help you find the right pair of shoes today?",
        timestamp: Date.now(),
        products: response.products,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      if (response.preferences) {
        setPreferences(response.preferences);
      }
      setPendingQuestion(response.pendingQuestion || null);
      if (response.readyForRecommendations !== undefined) {
        setReadyForRecommendations(response.readyForRecommendations);
      }
    } catch {
      const errorMessage: ChatMessage = {
        id: `assistant-err-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        role: "assistant",
        content: FALLBACK_ASSISTANT_ERROR,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSendMessage();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearConversation = () => {
    setIsTyping(false);
    const freshGreeting: ChatMessage = {
      ...INITIAL_ASSISTANT_MESSAGE,
      timestamp: Date.now(),
    };
    setMessages([freshGreeting]);
    setPreferences(null);
    setPendingQuestion(null);
    setReadyForRecommendations(false);
    setConversationId(null);
    setShowClearConfirm(false);

    if (!user) {
      sessionStorage.removeItem(SHOPPING_ASSISTANT_STORAGE_KEY);
    }
  };

  // Check if we should display suggestion chips (only if conversation has not proceeded beyond initial greeting)
  const isInitialState =
    messages.length === 1 && messages[0].role === "assistant";

  return (
    <>
      {/* ─────────────────────────────────────────────
          Chat Panel
          ───────────────────────────────────────────── */}
      {isOpen && (
        <section
          id="shopping-assistant-panel"
          role="dialog"
          aria-label="Shopping Assistant"
          aria-modal="false"
          style={{
            maxHeight: `min(540px, calc(100vh - ${headerBottom + 16}px - var(--panel-bottom-spacing, 5.5rem)))`,
          }}
          className="fixed bottom-20 right-3 z-40 flex h-[540px] [--panel-bottom-spacing:5rem] sm:[--panel-bottom-spacing:5.5rem] w-[calc(100vw-24px)] max-w-[390px] flex-col overflow-hidden rounded-2xl border border-[#E7E3DC] bg-white shadow-[0_16px_48px_rgba(32,37,43,0.14)] animate-popIn sm:bottom-22 sm:right-6 sm:w-[380px]"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[#E7E3DC] bg-[#FBFAF7] px-4 py-3 sm:px-4.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#748779] text-white shadow-xs">
                <IconSparkle className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-sm font-bold tracking-tight text-[#20252B]">
                    Shopping Assistant
                  </h2>
                  <span
                    className="h-2 w-2 rounded-full bg-[#748779]"
                    title="Online"
                    aria-hidden="true"
                  />
                </div>
                <p className="text-[11px] text-[#667085]">
                  {user ? "Synced with account" : "Find the right pair for you"}
                </p>
              </div>
            </div>

            {/* Header Controls */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                title={user ? "Start new conversation" : "Clear conversation"}
                aria-label={user ? "Start new conversation" : "Clear conversation"}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#667085] transition hover:bg-[#E5EAE6] hover:text-[#20252B] focus-visible:ring-2 focus-visible:ring-[#748779]"
              >
                <IconTrash className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close shopping assistant"
                aria-label="Close shopping assistant"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#667085] transition hover:bg-[#E5EAE6] hover:text-[#20252B] focus-visible:ring-2 focus-visible:ring-[#748779]"
              >
                <IconClose className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Clear / New Chat Confirmation Modal */}
          {showClearConfirm && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#20252B]/40 p-4 backdrop-blur-xs animate-fadeIn">
              <div className="w-full max-w-[280px] rounded-2xl border border-[#E7E3DC] bg-white p-4 shadow-lg text-center animate-popIn">
                <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[#F4F6F4] text-[#748779]">
                  <IconTrash className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-[#20252B]">
                  {user ? "Start new conversation?" : "Clear conversation?"}
                </h3>
                <p className="mt-1 text-xs text-[#667085]">
                  {user
                    ? "This will start a fresh chat while preserving your previous history."
                    : "This will reset your messages for this session."}
                </p>
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowClearConfirm(false)}
                    className="flex-1 rounded-xl border border-[#E7E3DC] bg-white py-2 text-xs font-semibold text-[#667085] transition hover:bg-[#F7F5F1] hover:text-[#20252B]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleClearConversation}
                    className="flex-1 rounded-xl bg-[#748779] py-2 text-xs font-semibold text-white transition hover:bg-[#5E7063]"
                  >
                    {user ? "New Chat" : "Clear"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Message List */}
          <div
            ref={messagesContainerRef}
            className="flex-1 space-y-3 overflow-y-auto bg-[#FBFAF7]/40 p-3.5 sm:p-4"
          >
            {messages.map((msg) => (
              <ShoppingAssistantMessage key={msg.id} message={msg} />
            ))}

            {isTyping && <ShoppingAssistantTypingIndicator />}

            {/* Suggestion Chips (shown during initial empty state) */}
            {isInitialState && !isTyping && (
              <div className="pt-2 animate-fadeIn">
                <p className="mb-2 text-[11px] font-medium text-[#667085]">
                  Suggested questions:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTION_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => handleSendMessage(chip)}
                      className="rounded-full border border-[#E7E3DC] bg-white px-3 py-1.5 text-xs font-medium text-[#20252B] shadow-2xs transition hover:border-[#748779] hover:bg-[#F4F6F4] active:scale-95"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Form Footer */}
          <form
            onSubmit={handleSubmit}
            className="border-t border-[#E7E3DC] bg-white p-3 sm:p-3.5"
          >
            <div className="relative flex items-end gap-2 rounded-xl border border-[#E7E3DC] bg-[#FBFAF7] px-3 py-2 transition focus-within:border-[#748779] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#748779]/20">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Ask about shoes, sizes, brands..."
                aria-label="Message shopping assistant"
                maxLength={500}
                className="max-h-24 min-h-[24px] flex-1 resize-none bg-transparent text-xs leading-relaxed text-[#20252B] placeholder-[#98A2B3] focus:outline-hidden"
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                title="Send message"
                aria-label="Send message"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#748779] text-white shadow-2xs transition hover:bg-[#5E7063] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <IconSend className="h-3.5 w-3.5" />
              </button>
            </div>
          </form>
        </section>
      )}

      {/* ─────────────────────────────────────────────
          Floating Launcher Button
          ───────────────────────────────────────────── */}
      <button
        type="button"
        id="shopping-assistant-launcher"
        onClick={() => setIsOpen((prev) => !prev)}
        title={isOpen ? "Close shopping assistant" : "Chat with shopping assistant"}
        aria-label={
          isOpen ? "Close shopping assistant" : "Open shopping assistant"
        }
        aria-expanded={isOpen}
        aria-controls="shopping-assistant-panel"
        className={`fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-[0_8px_24px_rgba(116,135,121,0.35)] transition-all duration-300 hover:scale-105 hover:shadow-[0_12px_28px_rgba(116,135,121,0.45)] focus-visible:ring-4 focus-visible:ring-[#748779]/30 active:scale-95 sm:bottom-6 sm:right-6 ${
          isOpen ? "bg-[#20252B] rotate-90" : "bg-[#748779] rotate-0"
        }`}
      >
        {isOpen ? (
          <IconClose className="h-6 w-6" />
        ) : (
          <IconChatBubble className="h-6 w-6" />
        )}
      </button>
    </>
  );
}

export default ShoppingAssistant;
