import { cn } from "@/lib/utils";

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "pink" | "blue" | "neutral" | "amber";
};

export function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-pill border px-3 py-1 text-xs font-bold",
        tone === "pink" && "border-pink-line bg-pink-soft text-pink-deep",
        tone === "blue" && "border-blue-line bg-blue-soft text-blue-deep",
        tone === "amber" && "border-[#F3D5A0] bg-[#FFF7E7] text-[#9A6B19]",
        tone === "neutral" && "border-line bg-line-2 text-ink-2",
        className,
      )}
      {...props}
    />
  );
}
