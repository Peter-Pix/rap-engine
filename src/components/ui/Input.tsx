import * as React from "react";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`
          flex h-10 w-full rounded-lg border border-white/[0.08] bg-zinc-900/60 
          px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 
          focus:outline-none focus:ring-2 focus:ring-[var(--re-accent)]/50 
          focus:border-transparent transition-all
          ${className}
        `}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
