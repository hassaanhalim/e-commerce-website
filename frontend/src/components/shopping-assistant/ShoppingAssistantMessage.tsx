import type { ChatMessage } from "./types";
import ShoppingAssistantProductCard from "./ShoppingAssistantProductCard";
import FormattedMessageContent from "./FormattedMessageContent";

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
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#748779] text-white shadow-2xs"
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
        <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
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
      <div className={`flex flex-col items-start ${hasProducts ? "w-full min-w-0 max-w-[95%]" : "max-w-[92%]"}`}>
        <div className="w-full rounded-2xl rounded-tl-xs border border-[#E7E3DC] bg-[#F7F5F1] px-4 py-3 text-sm leading-relaxed text-[#20252B] shadow-xs break-words">
          <FormattedMessageContent content={message.content} />
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
