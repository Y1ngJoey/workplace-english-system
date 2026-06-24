import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-pill px-4 py-2 text-sm font-bold transition disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        pink: "bg-pink text-white shadow-milk hover:bg-pink-deep",
        blue: "bg-blue text-white shadow-milk hover:bg-blue-deep",
        outline:
          "border border-pink-line bg-white text-pink-deep hover:bg-pink-soft",
        ghost: "text-ink-2 hover:bg-line-2",
        softPink: "bg-pink-soft text-pink-deep hover:bg-pink-line",
        softBlue: "bg-blue-soft text-blue-deep hover:bg-blue-line",
        danger: "bg-[#FFF1EF] text-[#B75B4F] hover:bg-[#FFE2DD]",
      },
      size: {
        sm: "min-h-8 px-3 text-xs",
        md: "min-h-10 px-4",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "pink",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
