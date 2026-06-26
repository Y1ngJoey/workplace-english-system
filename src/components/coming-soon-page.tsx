import Link from "next/link";
import { ArrowLeft, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type ComingSoonPageProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  tone: "mint" | "blue";
  bullets: string[];
};

export function ComingSoonPage({ title, description, icon: Icon, tone, bullets }: ComingSoonPageProps) {
  return (
    <div className="space-y-6">
      <section
        className={cn(
          "rounded-[20px] border p-6 shadow-milk",
          tone === "mint" && "border-mint-line bg-mint-soft/70",
          tone === "blue" && "border-blue-line bg-blue-soft/70",
        )}
      >
        <div
          className={cn(
            "mb-5 flex h-14 w-14 items-center justify-center rounded-pill bg-white shadow-sm",
            tone === "mint" ? "text-mint-deep" : "text-blue-deep",
          )}
        >
          <Icon className="h-6 w-6" />
        </div>
        <h1 className="font-display text-4xl font-extrabold text-ink">{title}</h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-ink-2">{description}</p>
      </section>

      <Card>
        <CardContent className="p-6">
          <p className="mb-4 font-display text-2xl font-extrabold text-ink">以后这里会有</p>
          <div className="grid gap-3 md:grid-cols-3">
            {bullets.map((item) => (
              <div key={item} className="rounded-[18px] border border-line bg-line-2/60 px-4 py-3 text-sm font-bold text-ink-2">
                {item}
              </div>
            ))}
          </div>
          <Button asChild className="mt-6" variant={tone === "mint" ? "softBlue" : "outline"}>
            <Link href="/app/home">
              <ArrowLeft className="h-4 w-4" />
              回到首页
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
