"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  LineChart,
  Mic2,
  NotebookTabs,
  Plus,
  Settings,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { AuthGate } from "@/components/auth-gate";
import { CorpusDialogProvider, useCorpusDialog } from "@/components/corpus-dialog-context";
import { CorpusEntryDialog } from "@/components/corpus-entry-dialog";
import { Button } from "@/components/ui/button";
import { formatChineseDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

const innerNav = [
  { href: "/app/today", label: "今日", icon: CalendarDays, tone: "pink" },
  { href: "/app/corpus", label: "语料库", icon: BookOpen, tone: "pink" },
  { href: "/app/weekly", label: "每周复盘", icon: NotebookTabs, tone: "pink" },
  { href: "/app/roleplay", label: "语音陪练", icon: Mic2, tone: "pink" },
  { href: "/app/growth", label: "成长记录", icon: Sparkles, tone: "pink" },
] as const;

const outerNav = [
  { href: "/app/content", label: "内容追踪", icon: TrendingUp, tone: "blue", disabled: true },
  { href: "/app/ideas", label: "选题灵感", icon: Sparkles, tone: "blue", disabled: true },
  { href: "/app/validation", label: "验证看板", icon: LineChart, tone: "blue", disabled: true },
] as const;

function NavItem({
  item,
}: {
  item: (typeof innerNav)[number] | (typeof outerNav)[number] | { href: string; label: string; icon: typeof Settings; tone: "pink"; disabled?: false };
}) {
  const pathname = usePathname();
  const active = pathname === item.href;
  const Icon = item.icon;
  const className = cn(
    "flex min-h-11 items-center gap-3 rounded-pill px-4 text-sm font-bold transition",
    item.tone === "pink" && (active ? "bg-pink-soft text-pink-deep" : "text-ink-2 hover:bg-pink-soft"),
    item.tone === "blue" && (active ? "bg-blue-soft text-blue-deep" : "text-ink-2 hover:bg-blue-soft"),
    "disabled" in item && item.disabled && "cursor-not-allowed opacity-55",
  );

  if ("disabled" in item && item.disabled) {
    return (
      <span className={className}>
        <Icon className="h-4 w-4" />
        {item.label}
      </span>
    );
  }

  return (
    <Link className={className} href={item.href}>
      <Icon className="h-4 w-4" />
      {item.label}
    </Link>
  );
}

function TopStrip() {
  const { openCreateDialog } = useCorpusDialog();
  return (
    <div className="sticky top-0 z-30 border-b border-line bg-paper/88 px-4 py-3 backdrop-blur lg:px-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3 text-sm font-bold text-ink-2">
          <span className="rounded-pill bg-white px-3 py-2 shadow-sm">{formatChineseDate()}</span>
          <span className="hidden rounded-pill bg-pink-soft px-3 py-2 text-pink-deep sm:inline-flex">连续打卡看今日卡片</span>
        </div>
        <Button variant="pink" onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
          新增语料
        </Button>
      </div>
    </div>
  );
}

function ShellContent({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="border-b border-line bg-card/80 px-4 py-4 backdrop-blur lg:min-h-screen lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
        <div className="mb-5 flex items-center justify-between gap-3 lg:block">
          <Link href="/app/today" className="font-display text-2xl font-extrabold text-ink">
            外贸英语 ♡ 工作台
          </Link>
          <Link
            href="/app/settings"
            className="inline-flex h-10 w-10 items-center justify-center rounded-pill text-slate hover:bg-line-2 lg:hidden"
            aria-label="设置"
          >
            <Settings className="h-4 w-4" />
          </Link>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 lg:block lg:space-y-6 lg:overflow-visible lg:pb-0">
          <nav className="flex shrink-0 gap-2 lg:block lg:space-y-2" aria-label="对内练习">
            <p className="mb-2 hidden px-3 text-xs font-extrabold text-pink-deep lg:block">对内 · 练习</p>
            {innerNav.map((item) => (
              <NavItem key={item.href} item={item} />
            ))}
          </nav>

          <nav className="flex shrink-0 gap-2 lg:block lg:space-y-2" aria-label="对外运营">
            <p className="mb-2 hidden px-3 text-xs font-extrabold text-blue-deep lg:block">对外 · 运营</p>
            {outerNav.map((item) => (
              <NavItem key={item.href} item={item} />
            ))}
          </nav>

          <nav className="hidden lg:block lg:space-y-2" aria-label="设置">
            <NavItem item={{ href: "/app/settings", label: "设置", icon: Settings, tone: "pink" }} />
          </nav>
        </div>
      </aside>

      <main className="min-w-0">
        <TopStrip />
        <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8 lg:py-8">{children}</div>
      </main>
      <CorpusEntryDialog />
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <CorpusDialogProvider>
        <ShellContent>{children}</ShellContent>
      </CorpusDialogProvider>
    </AuthGate>
  );
}
