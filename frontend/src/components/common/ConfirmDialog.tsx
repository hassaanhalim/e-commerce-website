import { useEffect } from "react";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  tone?: "default" | "danger";
}

function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  tone = "default",
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const confirmClass =
    tone === "danger"
      ? "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500"
      : "bg-gray-950 text-white hover:bg-gray-800 focus-visible:ring-gray-950";

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center px-4 py-6">
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        className="absolute inset-0 bg-gray-950/55 backdrop-blur-sm"
        onClick={onCancel}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.18)] animate-popIn"
      >
        <div className="border-b border-gray-100 px-6 py-4">
          <h2 id="confirm-dialog-title" className="text-lg font-bold tracking-tight text-gray-950">
            {title}
          </h2>
        </div>

        <div className="px-6 py-5">
          <p className="text-sm leading-6 text-gray-600">{description}</p>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex w-full items-center justify-center rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-100 sm:w-auto"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:w-auto ${confirmClass}`}
          >
            {confirmText}
          </button>
        </div>
      </section>
    </div>
  );
}

export default ConfirmDialog;