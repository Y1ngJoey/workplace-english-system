"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { EditableText } from "@/components/editable-text";
import { useAuth } from "@/components/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { homeRooms, homeTextDefaults, type HomeTextSlot } from "@/lib/home-content";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type HomeTextMap = Record<HomeTextSlot, string>;

const toneClasses = {
  pink: {
    spine: "bg-pink",
    icon: "bg-pink-soft text-pink-deep",
    badge: "pink" as const,
    hover: "hover:border-pink-line",
    text: "text-pink-deep",
  },
  grape: {
    spine: "bg-grape",
    icon: "bg-grape-soft text-grape-deep",
    badge: "neutral" as const,
    hover: "hover:border-grape-line",
    text: "text-grape-deep",
  },
  mint: {
    spine: "bg-mint",
    icon: "bg-mint-soft text-mint-deep",
    badge: "neutral" as const,
    hover: "hover:border-mint-line",
    text: "text-mint-deep",
  },
  blue: {
    spine: "bg-blue",
    icon: "bg-blue-soft text-blue-deep",
    badge: "blue" as const,
    hover: "hover:border-blue-line",
    text: "text-blue-deep",
  },
};

export default function HomeHubPage() {
  const { user } = useAuth();
  const [texts, setTexts] = useState<HomeTextMap>(homeTextDefaults);
  const [loading, setLoading] = useState(true);

  const slots = useMemo(() => Object.keys(homeTextDefaults) as HomeTextSlot[], []);

  const loadTexts = useCallback(async () => {
    if (!supabase || !user) {
      return;
    }
    setLoading(true);
    const { data } = await supabase.from("site_texts").select("slot, content").eq("user_id", user.id);
    const nextTexts: HomeTextMap = { ...homeTextDefaults };
    for (const row of data ?? []) {
      if (slots.includes(row.slot as HomeTextSlot)) {
        nextTexts[row.slot as HomeTextSlot] = row.content;
      }
    }
    setTexts(nextTexts);
    setLoading(false);
  }, [slots, user]);

  useEffect(() => {
    void loadTexts();
  }, [loadTexts]);

  async function saveText(slot: HomeTextSlot, content: string) {
    if (!supabase || !user) {
      return;
    }
    const nextContent = content || homeTextDefaults[slot];
    setTexts((current) => ({ ...current, [slot]: nextContent }));
    await supabase
      .from("site_texts")
      .upsert({ user_id: user.id, slot, content: nextContent, updated_at: new Date().toISOString() }, { onConflict: "user_id,slot" });
  }

  if (loading) {
    return (
      <div className="flex min-h-72 items-center justify-center text-ink-2">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        正在打开个人主场
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-end">
        <div className="space-y-5">
          <Badge tone="pink">个人主场</Badge>
          <EditableText
            aria-label="首页大标题"
            value={texts.home_title}
            onSave={(value) => saveText("home_title", value)}
            inputClassName="font-display text-5xl font-extrabold leading-tight text-ink sm:text-6xl"
          />
          <EditableText
            aria-label="首页介绍"
            value={texts.home_intro}
            onSave={(value) => saveText("home_intro", value)}
            multiline
            inputClassName="max-w-3xl text-base leading-8 text-ink-2"
          />
        </div>
        <Card className="border-mint-line bg-mint-soft/55">
          <CardContent className="p-5">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-pill bg-white text-mint-deep shadow-sm">
              <Sparkles className="h-5 w-5" />
            </div>
            <p className="font-display text-2xl font-extrabold text-ink">把生活分成几个小房间</p>
            <p className="mt-3 text-sm leading-6 text-mint-deep">
              英语、爵士、旅行、职业，都在同一个登录和同一个数据库里慢慢长出来。
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {homeRooms.map((room) => {
          const Icon = room.icon;
          const tone = toneClasses[room.tone];
          return (
            <Card key={room.key} className={cn("group relative overflow-hidden transition", tone.hover)}>
              <div className={cn("absolute inset-y-0 left-0 w-2", tone.spine)} />
              <CardContent className="flex h-full flex-col gap-5 p-6 pl-8">
                <div className="flex items-start justify-between gap-4">
                  <div className={cn("flex h-12 w-12 items-center justify-center rounded-pill", tone.icon)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <Link
                    href={room.href}
                    className={cn(
                      "inline-flex min-h-9 items-center gap-1 rounded-pill px-3 text-sm font-extrabold transition hover:bg-line-2",
                      tone.text,
                    )}
                  >
                    进去看看
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
                <div className="space-y-3">
                  <EditableText
                    aria-label={`${room.key} 房间名称`}
                    value={texts[room.nameSlot]}
                    onSave={(value) => saveText(room.nameSlot, value)}
                    inputClassName="font-display text-2xl font-extrabold text-ink"
                  />
                  <EditableText
                    aria-label={`${room.key} 房间描述`}
                    value={texts[room.descSlot]}
                    onSave={(value) => saveText(room.descSlot, value)}
                    multiline
                    inputClassName="text-sm leading-7 text-ink-2"
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <section className="rounded-[20px] border border-mint-line bg-gradient-to-r from-mint-soft via-white to-blue-soft p-6 shadow-milk">
        <p className="font-display text-2xl font-extrabold text-ink">慢慢扩建，不急着一次变完整。</p>
        <p className="mt-2 text-sm leading-6 text-ink-2">
          这里会优先保证私密、可编辑和可长期保存；新房间会一间一间接进来。
        </p>
      </section>
    </div>
  );
}
