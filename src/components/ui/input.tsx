import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-2xl border border-line bg-white px-4 text-sm text-ink-2 shadow-sm transition placeholder:text-slate focus:border-blue",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
