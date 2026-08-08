import React from "react";

interface AdminFormFieldProps extends React.InputHTMLAttributes<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> {
  label: string;
  type?: "text" | "number" | "email" | "password" | "textarea" | "select" | "checkbox";
  error?: string;
  options?: { value: string | number; label: string }[];
  helperText?: string;
  rows?: number;
}

export const AdminFormField = React.forwardRef<
  HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  AdminFormFieldProps
>(({ label, type = "text", error, options, helperText, className = "", rows, ...props }, ref) => {
  const isCheckbox = type === "checkbox";
  
  const baseInputStyles = `w-full rounded-xl border bg-white px-4 py-2.5 text-sm outline-none transition focus:border-black focus:ring-1 focus:ring-black ${
    error ? "border-red-500" : "border-gray-300"
  } ${className}`;

  return (
    <div className={`space-y-1.5 ${isCheckbox ? "flex items-center gap-2.5 space-y-0" : ""}`}>
      {isCheckbox ? (
        <>
          <input
            type="checkbox"
            ref={ref as React.Ref<HTMLInputElement>}
            className="h-4 w-4 rounded border-gray-300 accent-black cursor-pointer"
            {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
          />
          <label className="text-sm font-medium text-gray-800 cursor-pointer select-none">
            {label}
          </label>
        </>
      ) : (
        <>
          <label className="block text-sm font-semibold text-gray-700">
            {label}
          </label>
          
          {type === "textarea" ? (
            <textarea
              ref={ref as React.Ref<HTMLTextAreaElement>}
              className={baseInputStyles}
              rows={rows ?? 4}
              {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
            />
          ) : type === "select" ? (
            <select
              ref={ref as React.Ref<HTMLSelectElement>}
              className={baseInputStyles}
              {...(props as React.SelectHTMLAttributes<HTMLSelectElement>)}
            >
              {options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={type}
              ref={ref as React.Ref<HTMLInputElement>}
              className={baseInputStyles}
              {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
            />
          )}
        </>
      )}

      {helperText && !error && (
        <p className="text-xs text-gray-500">{helperText}</p>
      )}

      {error && (
        <p className="text-xs font-semibold text-red-500">{error}</p>
      )}
    </div>
  );
});

AdminFormField.displayName = "AdminFormField";

export default AdminFormField;
