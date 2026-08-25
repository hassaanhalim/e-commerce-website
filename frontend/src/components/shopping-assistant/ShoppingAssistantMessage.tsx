import type { ChatMessage } from "./types";
import ShoppingAssistantProductCard from "./ShoppingAssistantProductCard";

interface ShoppingAssistantMessageProps {
  message: ChatMessage;
}

function formatMessageTime(timestamp: number): string {
  try {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/* Assistant Avatar Icon */
function AssistantAvatar() {
  return (
    <div
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#E5EAE6] text-[#5E7063] border border-[#C9D5CC]"
      aria-hidden="true"
    >
      <svg
        className="h-3.5 w-3.5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Modern shopping spark / shoe outline icon */}
        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      </svg>
    </div>
  );
}

export function ShoppingAssistantMessage({ message }: ShoppingAssistantMessageProps) {
  const isUser = message.role === "user";
  const formattedTime = formatMessageTime(message.timestamp);
  const hasProducts = Boolean(message.products && message.products.length > 0);

  if (isUser) {
    return (
      <div className="flex flex-col items-end animate-fadeIn">
        <div className="max-w-[85%] rounded-2xl rounded-tr-xs bg-[#748779] px-3.5 py-2.5 text-sm leading-relaxed text-white shadow-xs break-words whitespace-pre-wrap">
          {message.content}
        </div>
        {formattedTime && (
          <span className="mt-1 pr-1 text-[10px] font-medium text-[#667085]">
            {formattedTime}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 animate-fadeIn">
      <AssistantAvatar />
      <div className={`flex flex-col items-start ${hasProducts ? "w-full min-w-0 max-w-[95%]" : "max-w-[85%]"}`}>
        <div className="rounded-2xl rounded-tl-xs border border-[#E7E3DC] bg-[#F7F5F1] px-3.5 py-2.5 text-sm leading-relaxed text-[#20252B] shadow-xs break-words whitespace-pre-wrap">
          {message.content}
        </div>

        {/* Real Product Recommendation Cards */}
        {hasProducts && (
          <div className="mt-2.5 flex w-full flex-col gap-2">
            {message.products!.map((product) => (
              <ShoppingAssistantProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {formattedTime && (
          <span className="mt-1 pl-1 text-[10px] font-medium text-[#667085]">
            {formattedTime}
          </span>
        )}
      </div>
    </div>
  );
}

export function ShoppingAssistantTypingIndicator() {
  return (
    <div className="flex items-start gap-2 animate-fadeIn">
      <AssistantAvatar />
      <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-xs border border-[#E7E3DC] bg-[#F7F5F1] px-4 py-3 shadow-xs">
        <span className="h-2 w-2 rounded-full bg-[#889B8D] animate-bounce [animation-delay:-0.3s]" />
        <span className="h-2 w-2 rounded-full bg-[#889B8D] animate-bounce [animation-delay:-0.15s]" />
        <span className="h-2 w-2 rounded-full bg-[#889B8D] animate-bounce" />
        <span className="sr-only">Shopping assistant is typing...</span>
      </div>
    </div>
  );
}

export default ShoppingAssistantMessage;
