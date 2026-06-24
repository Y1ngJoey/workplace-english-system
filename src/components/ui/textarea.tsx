import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "min-h-24 w-full resize-y rounded-2xl border border-line bg-white px-4 py-3 text-sm leading-6 text-ink-2 shadow-sm transition placeholder:text-slate focus:border-blue",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
