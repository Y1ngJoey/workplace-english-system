"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import type { KeyboardEvent, MouseEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  BriefcaseBusiness,
  CalendarDays,
  Globe2,
  Home,
  LineChart,
  Mic2,
  Music2,
  NotebookTabs,
  Plane,
  Plus,
  Settings,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { AuthGate } from "@/components/auth-gate";
import { CorpusDialogProvider, useCorpusDialog } from "@/components/corpus-dialog-context";
import { CorpusEntryDialog } from "@/components/corpus-entry-dialog";
import { EditableText } from "@/components/editable-text";
import { Button } from "@/components/ui/button";
import { formatChineseDate } from "@/lib/dates";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";
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

const shellTextDefaults = {
  shell_brand: "Joey's personal domain ♡",
  shell_nav_home: "首页",
  shell_nav_english: "外贸英语",
  shell_nav_jazz: "爵士档案",
  shell_nav_travel: "旅行美食",
  shell_nav_career: "职业历程",
  shell_english_title: "外贸英语 ♡ 工作台",
} as const;

const pmWorkbenchBackground = {
  background:
    "radial-gradient(circle at 8% 4%, rgba(246,185,202,.46), transparent 24%), radial-gradient(circle at 88% 0%, rgba(141,183,255,.38), transparent 28%), radial-gradient(circle at 78% 92%, rgba(139,220,189,.34), transparent 25%), linear-gradient(135deg,#fff9ee 0%,#f9fbff 42%,#f4fff9 100%)",
};

type ShellTextSlot = keyof typeof shellTextDefaults;
type ShellTextMap = Record<ShellTextSlot, string>;

const mainNav = [
  { href: "/app/home", labelSlot: "shell_nav_home", icon: Home, tone: "pink", match: (path: string) => path === "/app/home" },
  { href: "/app/today", labelSlot: "shell_nav_english", icon: Globe2, tone: "pink", match: (path: string) => englishRoutes.has(path) },
  { href: "/app/jazz", labelSlot: "shell_nav_jazz", icon: Music2, tone: "grape", match: (path: string) => path.startsWith("/app/jazz") },
  { href: "/app/travel", labelSlot: "shell_nav_travel", icon: Plane, tone: "mint", match: (path: string) => path.startsWith("/app/travel") },
  { href: "/app/career", labelSlot: "shell_nav_career", icon: BriefcaseBusiness, tone: "blue", match: (path: string) => path.startsWith("/app/career") },
] as const;

const englishRoutes = new Set([
  "/app/today",
  "/app/corpus",
  "/app/weekly",
  "/app/roleplay",
  "/app/growth",
  "/app/settings",
]);

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

function shellInputWidth(value: string, min = 3, max = 22) {
  return `${Math.min(max, Math.max(min, Array.from(value).length * 1.35 + 2))}em`;
}

function useShellTexts() {
  const { user } = useAuth();
  const [texts, setTexts] = useState<ShellTextMap>(shellTextDefaults);
  const slots = useMemo(() => Object.keys(shellTextDefaults) as ShellTextSlot[], []);

  useEffect(() => {
    if (!supabase || !user) return;
    let alive = true;
    supabase
      .from("site_texts")
      .select("slot, content")
      .eq("user_id", user.id)
      .in("slot", slots)
      .then(({ data }) => {
        if (!alive) return;
        const nextTexts: ShellTextMap = { ...shellTextDefaults };
        for (const row of data ?? []) {
          if (slots.includes(row.slot as ShellTextSlot)) {
            nextTexts[row.slot as ShellTextSlot] = row.content;
          }
        }
        setTexts(nextTexts);
      });
    return () => {
      alive = false;
    };
  }, [slots, user]);

  const saveText = useCallback(
    async (slot: ShellTextSlot, content: string) => {
      if (!supabase || !user) return;
      const nextContent = content || shellTextDefaults[slot];
      setTexts((current) => ({ ...current, [slot]: nextContent }));
      await supabase
        .from("site_texts")
        .upsert({ user_id: user.id, slot, content: nextContent, updated_at: new Date().toISOString() }, { onConflict: "user_id,slot" });
    },
    [user],
  );

  return { texts, saveText };
}

function MainTopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { texts, saveText } = useShellTexts();

  function navigate(event: MouseEvent<HTMLDivElement>, href: string) {
    if ((event.target as HTMLElement).closest("input,textarea")) return;
    router.push(href);
  }

  function navigateByKey(event: KeyboardEvent<HTMLDivElement>, href: string) {
    if ((event.target as HTMLElement).closest("input,textarea")) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      router.push(href);
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-[#FCF6F4]/88 px-4 py-1.5 backdrop-blur lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-1 sm:flex-nowrap">
        <div
          role="link"
          tabIndex={0}
          className="max-w-full shrink-0 cursor-pointer"
          onClick={(event) => navigate(event, "/app/home")}
          onKeyDown={(event) => navigateByKey(event, "/app/home")}
        >
          <EditableText
            aria-label="顶部站点名称"
            value={texts.shell_brand}
            onSave={(value) => saveText("shell_brand", value)}
            inputClassName="h-8 max-w-[calc(100vw-2rem)] rounded-md bg-transparent px-0 py-0 font-display text-[1.05rem] font-extrabold leading-none text-ink sm:max-w-none sm:text-[1.35rem]"
            inputStyle={{ width: shellInputWidth(texts.shell_brand, 9, 18) }}
          />
        </div>
        <nav className="flex min-w-0 basis-full justify-start gap-2 overflow-x-auto pb-1 sm:ml-auto sm:basis-auto sm:justify-end lg:pb-0" aria-label="个人主场导航">
          {mainNav.map((item) => {
            const active = item.match(pathname);
            const Icon = item.icon;
            return (
              <div
                key={item.href}
                role="link"
                tabIndex={0}
                onClick={(event) => navigate(event, item.href)}
                onKeyDown={(event) => navigateByKey(event, item.href)}
                className={cn(
                  "inline-flex min-h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-pill border px-3 transition",
                  item.tone === "pink" &&
                    (active
                      ? "border-pink-line bg-pink-soft text-pink-deep"
                      : "border-transparent text-ink-2 hover:bg-pink-soft"),
                  item.tone === "grape" &&
                    (active
                      ? "border-grape-line bg-grape-soft text-grape-deep"
                      : "border-transparent text-ink-2 hover:bg-grape-soft"),
                  item.tone === "mint" &&
                    (active
                      ? "border-mint-line bg-mint-soft text-mint-deep"
                      : "border-transparent text-ink-2 hover:bg-mint-soft"),
                  item.tone === "blue" &&
                    (active
                      ? "border-blue-line bg-blue-soft text-blue-deep"
                      : "border-transparent text-ink-2 hover:bg-blue-soft"),
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <EditableText
                  aria-label="顶部导航名称"
                  value={texts[item.labelSlot]}
                  onSave={(value) => saveText(item.labelSlot, value)}
                  inputClassName="h-6 rounded-md bg-transparent px-0 py-0 text-[13px] font-extrabold"
                  inputStyle={{ width: shellInputWidth(texts[item.labelSlot], 3.6, 9) }}
                />
              </div>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

function EditableEnglishTitle() {
  const router = useRouter();
  const { texts, saveText } = useShellTexts();

  function navigate(event: MouseEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("input,textarea")) return;
    router.push("/app/today");
  }

  function navigateByKey(event: KeyboardEvent<HTMLDivElement>) {
    if ((event.target as HTMLElement).closest("input,textarea")) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      router.push("/app/today");
    }
  }

  return (
    <div role="link" tabIndex={0} className="cursor-pointer" onClick={navigate} onKeyDown={navigateByKey}>
      <EditableText
        aria-label="外贸英语侧栏标题"
        value={texts.shell_english_title}
        onSave={(value) => saveText("shell_english_title", value)}
        inputClassName="h-9 rounded-md bg-transparent px-0 py-0 font-display text-2xl font-extrabold text-ink"
        inputStyle={{ width: shellInputWidth(texts.shell_english_title, 8, 15) }}
      />
    </div>
  );
}

function ShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showEnglishShell = englishRoutes.has(pathname);
  const showTravelShell = pathname.startsWith("/app/travel");
  const showPmWorkbenchShell = pathname === "/app/today";

  if (showPmWorkbenchShell) {
    return (
      <div className="min-h-screen" style={pmWorkbenchBackground}>
        <MainTopNav />
        <main className="min-w-0">{children}</main>
        <CorpusEntryDialog />
      </div>
    );
  }

  if (!showEnglishShell) {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#FCEEF0_0%,#FCF6F4_55%,#FBFAF8_100%)]">
        <MainTopNav />
        <main className={showTravelShell ? "min-w-0 py-0" : "mx-auto max-w-7xl px-4 py-4 lg:px-8 lg:py-6"}>
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <MainTopNav />
      <div className="lg:grid lg:grid-cols-[17rem_minmax(0,1fr)]">
      <aside className="border-b border-line bg-card/80 px-4 py-4 backdrop-blur lg:min-h-[calc(100vh-73px)] lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
        <div className="mb-5 flex items-center justify-between gap-3 lg:block">
          <EditableEnglishTitle />
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
      </div>
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
