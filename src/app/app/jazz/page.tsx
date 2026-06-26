"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Copy,
  Goal,
  Heart,
  Loader2,
  Music2,
  Plus,
  Trash2,
  Video,
} from "lucide-react";
import { EditableText } from "@/components/editable-text";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toast-provider";
import { VideoPreview } from "@/components/video-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { todayKey } from "@/lib/dates";
import { supabase } from "@/lib/supabase";
import type { JazzCompare, JazzInspiration, JazzTimeline, Visibility } from "@/lib/types";
import { cn } from "@/lib/utils";

type JazzTab = "timeline" | "compare" | "inspiration";
type BusyAction = JazzTab | "goal" | null;

const tabs: Array<{ id: JazzTab; label: string; icon: typeof Music2 }> = [
  { id: "timeline", label: "成长时间线", icon: CalendarDays },
  { id: "compare", label: "前后对比", icon: Video },
  { id: "inspiration", label: "灵感收藏夹", icon: Heart },
];

function sortTimelineRows(rows: JazzTimeline[]) {
  return [...rows].sort(
    (a, b) =>
      b.entry_date.localeCompare(a.entry_date) ||
      a.position - b.position ||
      (b.created_at ?? "").localeCompare(a.created_at ?? ""),
  );
}

function formatTimelineLabel(value: string) {
  const [year, month] = value.split("-");
  return year && month ? `${year} · ${month}` : value;
}

function makeTimelineCurvePath(height: number, count: number) {
  const points = Array.from({ length: Math.max(count, 1) }, (_, index) => {
    const point = getTimelinePoint(index, Math.max(count, 1), height);
    return {
      x: index % 2 === 0 ? 470 : 290,
      y: Number.parseFloat(point.y),
    };
  });
  const start = { x: 380, y: 70 };
  const end = { x: 380, y: height - 70 };
  const parts = [`M ${start.x},${start.y}`];
  let previous = start;

  for (const point of points) {
    const midY = previous.y + (point.y - previous.y) * 0.5;
    parts.push(`C ${previous.x},${midY} ${point.x},${midY} ${point.x},${point.y}`);
    previous = point;
  }

  const midY = previous.y + (end.y - previous.y) * 0.5;
  parts.push(`C ${previous.x},${midY} ${end.x},${midY} ${end.x},${end.y}`);
  return parts.join(" ");
}

function getTimelinePoint(index: number, count: number, height: number) {
  const itemCount = Math.max(count, 1);
  const margin = itemCount <= 2 ? height * 0.36 : height * 0.14;
  const y = itemCount === 1 ? height / 2 : margin + (index / (itemCount - 1)) * (height - margin * 2);
  const right = index % 2 === 0;

  return {
    cardLeft: right ? "64%" : "2%",
    dotLeft: right ? "61.8%" : "38.2%",
    labelClassName: right ? "-translate-x-full -translate-y-1/2 -ml-3" : "translate-x-0 -translate-y-1/2 ml-3",
    y: String(y),
    top: `${(y / height) * 100}%`,
  };
}

function getErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return error instanceof Error ? error.message : "请稍后再试一次。";
}

function VisibilityButton({
  value,
  onChange,
  compact = false,
}: {
  value: Visibility;
  onChange: (visibility: Visibility) => Promise<void>;
  compact?: boolean;
}) {
  const nextValue = value === "private" ? "public" : "private";
  return (
    <Button
      variant={value === "private" ? "outline" : "softBlue"}
      size="sm"
      className={cn(compact && "min-h-8 px-3 text-[11px]")}
      onClick={() => onChange(nextValue)}
    >
      {value === "private" ? "🔒 私密" : "🌐 公开"}
    </Button>
  );
}

function VideoUrlInput({
  value,
  onSave,
  placeholder,
  className,
  inputClassName,
  copyable = false,
  onCopy,
}: {
  value: string | null;
  onSave: (value: string) => Promise<void>;
  placeholder: string;
  className?: string;
  inputClassName?: string;
  copyable?: boolean;
  onCopy?: (value: string) => Promise<void>;
}) {
  const [draft, setDraft] = useState(value ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  async function save() {
    if (draft.trim() === (value ?? "")) return;
    setSaving(true);
    await onSave(draft.trim());
    setSaving(false);
  }

  async function copyDraft() {
    const nextValue = draft.trim();
    if (!nextValue) return;
    if (nextValue !== (value ?? "")) {
      setSaving(true);
      await onSave(nextValue);
      setSaving(false);
    }
    await onCopy?.(nextValue);
  }

  const input = (
    <div className={cn("relative", copyable && "min-w-0 flex-1")}>
      <Input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={save}
        placeholder={placeholder}
        className={inputClassName}
      />
      {saving ? <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-blue-deep" /> : null}
    </div>
  );

  if (copyable) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {input}
        <Button
          variant="softPink"
          size="icon"
          className="h-10 w-10"
          aria-label="复制视频网址"
          disabled={!draft.trim()}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => copyDraft()}
        >
          <Copy className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {input}
    </div>
  );
}

function TimelineVideoField({
  label,
  tone,
  url,
  placeholder,
  onSave,
  onCopy,
}: {
  label: string;
  tone: "teach" | "mine";
  url: string | null | undefined;
  placeholder: string;
  onSave: (value: string) => Promise<void>;
  onCopy: (value: string) => Promise<void>;
}) {
  return (
    <div className="space-y-2">
      <div
        className={cn(
          "flex items-center gap-1.5 px-1 text-[11px] font-extrabold",
          tone === "teach" ? "text-grape-deep" : "text-pink-deep",
        )}
      >
        {label}
      </div>
      <VideoPreview
        url={url}
        label={label}
        showLabel={false}
        className={cn(tone === "teach" ? "border-grape-line" : "border-pink-line")}
      />
      <VideoUrlInput
        value={url ?? null}
        placeholder={placeholder}
        inputClassName="h-9 rounded-pill px-3 text-[11px]"
        copyable
        onCopy={onCopy}
        onSave={onSave}
      />
    </div>
  );
}

function TimelineCard({
  item,
  index,
  total,
  point,
  onUpdate,
  onMove,
  onDelete,
  onCopy,
}: {
  item: JazzTimeline;
  index: number;
  total: number;
  point?: ReturnType<typeof getTimelinePoint>;
  onUpdate: (id: string, patch: Partial<JazzTimeline>) => Promise<void>;
  onMove: (item: JazzTimeline, direction: -1 | 1) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onCopy: (value: string) => Promise<void>;
}) {
  return (
    <Card
      className={cn(
        "overflow-hidden border-grape-line/70 bg-white/95 shadow-milk",
        point ? "absolute w-[34%] -translate-y-1/2" : "border-l-4 border-l-grape",
      )}
      style={point ? { left: point.cardLeft, top: point.top } : undefined}
    >
      <CardContent className="flex h-full flex-col gap-3 p-3">
        <div className="flex items-center justify-between gap-2">
          <Input
            type="date"
            value={item.entry_date}
            className="h-8 rounded-pill px-3 text-[11px]"
            onChange={(event) => onUpdate(item.id, { entry_date: event.target.value })}
          />
          <VisibilityButton compact value={item.visibility} onChange={(visibility) => onUpdate(item.id, { visibility })} />
        </div>

        <EditableText
          aria-label="时间线标题"
          value={item.title}
          onSave={(value) => onUpdate(item.id, { title: value || "未命名记录" })}
          inputClassName="font-display text-lg font-extrabold leading-tight text-ink"
        />

        <div className="space-y-3">
          <TimelineVideoField
            label="🎓 对标教学"
            tone="teach"
            url={item.reference_url}
            placeholder="对标教学视频链接"
            onCopy={onCopy}
            onSave={(value) => onUpdate(item.id, { reference_url: value || null })}
          />
          <div className="flex items-center gap-2 px-1">
            <span className="h-px flex-1 bg-line" />
            <span className="rounded-pill border border-line bg-paper px-3 py-0.5 text-[10px] font-extrabold text-slate">
              照着练
            </span>
            <span className="h-px flex-1 bg-line" />
          </div>
          <TimelineVideoField
            label="🌸 我的练习"
            tone="mine"
            url={item.video_url}
            placeholder="我的练习视频链接"
            onCopy={onCopy}
            onSave={(value) => onUpdate(item.id, { video_url: value || null })}
          />
        </div>

        <EditableText
          aria-label="时间线笔记"
          value={item.note}
          onSave={(value) => onUpdate(item.id, { note: value })}
          inputClassName="text-xs leading-5 text-ink-2"
        />

        <div className="mt-auto flex items-center justify-between gap-2 border-t border-line/80 pt-3">
          <span className="rounded-pill bg-grape-soft px-3 py-1 text-[11px] font-extrabold text-grape-deep">
            {formatTimelineLabel(item.entry_date)}
          </span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="上移"
              onClick={() => onMove(item, -1)}
              disabled={index === 0}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              aria-label="下移"
              onClick={() => onMove(item, 1)}
              disabled={index === total - 1}
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
            <Button variant="danger" size="icon" className="h-8 w-8" aria-label="删除" onClick={() => onDelete(item.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function JazzPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<JazzTab>("timeline");
  const [timeline, setTimeline] = useState<JazzTimeline[]>([]);
  const [compare, setCompare] = useState<JazzCompare[]>([]);
  const [inspiration, setInspiration] = useState<JazzInspiration[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<BusyAction>(null);

  const load = useCallback(async () => {
    if (!supabase || !user) return;
    setLoading(true);
    const [timelineResult, compareResult, inspirationResult] = await Promise.all([
      supabase
        .from("jazz_timeline")
        .select("*")
        .eq("user_id", user.id)
        .order("entry_date", { ascending: false })
        .order("position", { ascending: true }),
      supabase.from("jazz_compare").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase
        .from("jazz_inspiration")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

    const error = timelineResult.error || compareResult.error || inspirationResult.error;
    if (error) {
      toast({ title: "爵士档案读取失败", description: error.message, tone: "error" });
    } else {
      setTimeline(sortTimelineRows((timelineResult.data ?? []) as JazzTimeline[]));
      setCompare((compareResult.data ?? []) as JazzCompare[]);
      setInspiration((inspirationResult.data ?? []) as JazzInspiration[]);
    }
    setLoading(false);
  }, [toast, user]);

  useEffect(() => {
    void load();
  }, [load]);

  const nextTimelinePosition = useMemo(
    () => (timeline.length ? Math.max(...timeline.map((item) => item.position)) + 1 : 0),
    [timeline],
  );
  const timelineCurveHeight = useMemo(() => Math.max(1120, timeline.length * 520 + 240), [timeline.length]);
  const timelineCurvePath = useMemo(
    () => makeTimelineCurvePath(timelineCurveHeight, timeline.length),
    [timelineCurveHeight, timeline.length],
  );

  async function updateTimeline(id: string, patch: Partial<JazzTimeline>) {
    if (!supabase) return;
    setTimeline((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    const { error } = await supabase.from("jazz_timeline").update(patch).eq("id", id);
    if (error) {
      toast({ title: "时间线保存失败", description: error.message, tone: "error" });
      await load();
    }
  }

  async function updateCompare(id: string, patch: Partial<JazzCompare>) {
    if (!supabase) return;
    setCompare((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    const { error } = await supabase.from("jazz_compare").update(patch).eq("id", id);
    if (error) {
      toast({ title: "对比墙保存失败", description: error.message, tone: "error" });
      await load();
    }
  }

  async function updateInspiration(id: string, patch: Partial<JazzInspiration>) {
    if (!supabase) return;
    setInspiration((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    const { error } = await supabase.from("jazz_inspiration").update(patch).eq("id", id);
    if (error) {
      toast({ title: "灵感保存失败", description: error.message, tone: "error" });
      await load();
    }
  }

  async function copyVideoUrl(url: string | null | undefined) {
    const value = url?.trim();
    if (!value) {
      toast({ title: "还没有网址可复制", description: "先粘贴视频链接，再点复制。", tone: "error" });
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      toast({ title: "视频网址已复制", tone: "success" });
    } catch {
      toast({ title: "复制失败", description: "可以先手动选中网址复制。", tone: "error" });
    }
  }

  async function addTimeline() {
    if (!supabase || !user) {
      toast({ title: "新增失败", description: "请先登录后再记录爵士档案。", tone: "error" });
      return;
    }
    setBusyAction("timeline");
    try {
      const { data, error } = await supabase
        .from("jazz_timeline")
        .insert({
          user_id: user.id,
          entry_date: todayKey(),
          title: "新的爵士记录",
          note: "今天想记录的是...",
          visibility: "private",
          position: nextTimelinePosition,
        })
        .select("*")
        .single();
      if (error) throw error;
      setTimeline((current) => sortTimelineRows([data as JazzTimeline, ...current]));
      toast({ title: "已新增爵士记录", tone: "success" });
    } catch (error) {
      toast({ title: "新增时间线失败", description: getErrorMessage(error), tone: "error" });
    } finally {
      setBusyAction(null);
    }
  }

  async function addCompare() {
    if (!supabase || !user) {
      toast({ title: "新增失败", description: "请先登录后再记录爵士档案。", tone: "error" });
      return;
    }
    setBusyAction("compare");
    try {
      const { data, error } = await supabase
        .from("jazz_compare")
        .insert({
          user_id: user.id,
          title: "新的前后对比",
          visibility: "private",
        })
        .select("*")
        .single();
      if (error) throw error;
      setCompare((current) => [data as JazzCompare, ...current]);
      toast({ title: "已新增前后对比", tone: "success" });
    } catch (error) {
      toast({ title: "新增对比失败", description: getErrorMessage(error), tone: "error" });
    } finally {
      setBusyAction(null);
    }
  }

  async function addInspiration() {
    if (!supabase || !user) {
      toast({ title: "新增失败", description: "请先登录后再记录爵士档案。", tone: "error" });
      return;
    }
    setBusyAction("inspiration");
    try {
      const { data, error } = await supabase
        .from("jazz_inspiration")
        .insert({
          user_id: user.id,
          note: "想学这个感觉",
          tags: ["jazz"],
          visibility: "private",
        })
        .select("*")
        .single();
      if (error) throw error;
      setInspiration((current) => [data as JazzInspiration, ...current]);
      toast({ title: "已收藏爵士灵感", tone: "success" });
    } catch (error) {
      toast({ title: "新增灵感失败", description: getErrorMessage(error), tone: "error" });
    } finally {
      setBusyAction(null);
    }
  }

  async function deleteRow(table: "jazz_timeline" | "jazz_compare" | "jazz_inspiration", id: string) {
    if (!supabase || !confirm("删除这条爵士档案？")) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) {
      toast({ title: "删除失败", description: error.message, tone: "error" });
      return;
    }
    await load();
  }

  async function moveTimeline(item: JazzTimeline, direction: -1 | 1) {
    if (!supabase) return;
    const sorted = [...timeline].sort((a, b) => b.entry_date.localeCompare(a.entry_date) || a.position - b.position);
    const currentIndex = sorted.findIndex((row) => row.id === item.id);
    const swapWith = sorted[currentIndex + direction];
    if (!swapWith) return;

    await Promise.all([
      supabase.from("jazz_timeline").update({ position: swapWith.position }).eq("id", item.id),
      supabase.from("jazz_timeline").update({ position: item.position }).eq("id", swapWith.id),
    ]);
    await load();
  }

  async function setAsGoal(item: JazzInspiration) {
    if (!supabase || !user) return;
    setBusyAction("goal");
    try {
      const { data, error } = await supabase
        .from("jazz_timeline")
        .insert({
          user_id: user.id,
          entry_date: todayKey(),
          title: "目标：" + (item.note || "新的爵士目标").slice(0, 24),
          note: `来自灵感收藏夹：${item.note}`,
          video_url: item.video_url,
          visibility: item.visibility,
          position: nextTimelinePosition,
        })
        .select("*")
        .single();
      if (error) throw error;
      setTimeline((current) => sortTimelineRows([data as JazzTimeline, ...current]));
      toast({ title: "已写入成长时间线", tone: "success" });
      setActiveTab("timeline");
    } catch (error) {
      toast({ title: "设为目标失败", description: getErrorMessage(error), tone: "error" });
    } finally {
      setBusyAction(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-72 items-center justify-center text-ink-2">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        正在打开爵士档案
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[20px] border border-grape-line bg-grape-soft/70 p-6 shadow-milk">
        <Badge tone="neutral">爵士档案</Badge>
        <h1 className="mt-4 font-display text-4xl font-extrabold text-ink">把每一次变好，都留一点证据</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-ink-2">
          成长时间线、前后对比和灵感收藏夹都只保存文字与外部视频链接。
        </p>
      </section>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={cn(
                "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-pill border px-4 text-sm font-extrabold transition",
                activeTab === tab.id
                  ? "border-grape-line bg-grape-soft text-grape-deep"
                  : "border-line bg-white text-ink-2 hover:bg-grape-soft",
              )}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "timeline" ? (
        <section className="space-y-4">
          <div className="flex justify-end">
            <Button variant="pink" onClick={addTimeline} disabled={busyAction === "timeline"}>
              {busyAction === "timeline" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              记一笔
            </Button>
          </div>
          {timeline.length === 0 ? (
            <EmptyJazzCard title="还没有时间线记录" action="记一笔" onClick={addTimeline} busy={busyAction === "timeline"} />
          ) : (
            <div className="mx-auto max-w-[920px]">
              <div className="mb-4 text-center">
                <h2 className="font-display text-3xl font-extrabold text-ink">成长时间线 🎷</h2>
                <p className="mt-1 text-sm font-bold text-slate">左边对标、右边自己跳，照着练最快 ♡</p>
              </div>

              <div className="hidden lg:block">
                <div className="relative mx-auto max-w-[760px]" style={{ height: timelineCurveHeight }}>
                  <svg
                    className="absolute inset-0 h-full w-full"
                    viewBox={`0 0 760 ${timelineCurveHeight}`}
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <defs>
                      <linearGradient id="jazzTimelineRibbon" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#F0A4C0" />
                        <stop offset="0.5" stopColor="#C3A4DD" />
                        <stop offset="1" stopColor="#A8D8C0" />
                      </linearGradient>
                    </defs>
                    <path d={timelineCurvePath} stroke="url(#jazzTimelineRibbon)" strokeWidth="13" strokeLinecap="round" opacity="0.18" />
                    <path d={timelineCurvePath} stroke="url(#jazzTimelineRibbon)" strokeWidth="4.5" strokeLinecap="round" />
                  </svg>

                  <div className="absolute inset-0">
                    {timeline.map((item, index) => {
                      const point = getTimelinePoint(index, timeline.length, timelineCurveHeight);
                      return (
                        <span
                          key={`${item.id}-dot`}
                          className="absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3.5px] border-grape bg-white shadow-[0_0_0_5px_var(--grape-soft)]"
                          style={{ left: point.dotLeft, top: point.top }}
                        />
                      );
                    })}
                  </div>

                  <div className="absolute inset-0">
                    {timeline.map((item, index) => {
                      const point = getTimelinePoint(index, timeline.length, timelineCurveHeight);
                      return (
                        <span
                          key={`${item.id}-label`}
                          className={cn(
                            "absolute whitespace-nowrap rounded-pill border border-grape-line bg-grape-soft px-3 py-1 text-[11px] font-extrabold text-grape-deep",
                            point.labelClassName,
                          )}
                          style={{ left: point.dotLeft, top: point.top }}
                        >
                          {formatTimelineLabel(item.entry_date)}
                        </span>
                      );
                    })}
                  </div>

                  <div className="absolute inset-0">
                    {timeline.map((item, index) => (
                      <TimelineCard
                        key={item.id}
                        item={item}
                        index={index}
                        total={timeline.length}
                        point={getTimelinePoint(index, timeline.length, timelineCurveHeight)}
                        onUpdate={updateTimeline}
                        onMove={moveTimeline}
                        onDelete={(id) => deleteRow("jazz_timeline", id)}
                        onCopy={copyVideoUrl}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4 lg:hidden">
                {timeline.map((item, index) => (
                  <TimelineCard
                    key={item.id}
                    item={item}
                    index={index}
                    total={timeline.length}
                    onUpdate={updateTimeline}
                    onMove={moveTimeline}
                    onDelete={(id) => deleteRow("jazz_timeline", id)}
                    onCopy={copyVideoUrl}
                  />
                ))}
              </div>

              <div className="mx-auto mt-6 max-w-xl rounded-[18px] border border-mint-line bg-gradient-to-b from-white to-mint-soft px-5 py-4 text-center">
                <p className="text-sm font-extrabold text-mint-deep">一条线串起所有进步</p>
                <p className="mt-1 text-xs leading-5 text-slate">
                  每条都能放「对标教学 + 我的练习」两个视频，照着改最快 · 标题和笔记可改 · 可设私密/公开
                </p>
              </div>
            </div>
          )}
        </section>
      ) : null}

      {activeTab === "compare" ? (
        <section className="space-y-4">
          <div className="flex justify-end">
            <Button variant="pink" onClick={addCompare} disabled={busyAction === "compare"}>
              {busyAction === "compare" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              加一组
            </Button>
          </div>
          {compare.length === 0 ? (
            <EmptyJazzCard title="还没有前后对比" action="加一组" onClick={addCompare} busy={busyAction === "compare"} />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {compare.map((item) => (
                <Card key={item.id} className="overflow-hidden bg-white/90">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <EditableText
                        aria-label="对比标题"
                        value={item.title}
                        onSave={(value) => updateCompare(item.id, { title: value || "未命名对比" })}
                        inputClassName="font-display text-xl font-extrabold leading-tight text-ink"
                      />
                      <div className="flex shrink-0 gap-2">
                        <VisibilityButton
                          compact
                          value={item.visibility}
                          onChange={(visibility) => updateCompare(item.id, { visibility })}
                        />
                        <Button
                          variant="danger"
                          size="icon"
                          className="h-8 w-8"
                          aria-label="删除"
                          onClick={() => deleteRow("jazz_compare", item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-4 p-4 pt-2 sm:grid-cols-2">
                    <div className="space-y-3">
                      <Badge tone="pink">以前</Badge>
                      <VideoPreview url={item.before_url} label="以前" orientation="portrait" showLabel={false} />
                      <VideoUrlInput
                        value={item.before_url}
                        placeholder="以前的视频链接"
                        inputClassName="h-10 rounded-pill px-3 text-xs"
                        copyable
                        onCopy={copyVideoUrl}
                        onSave={(value) => updateCompare(item.id, { before_url: value || null })}
                      />
                    </div>
                    <div className="space-y-3">
                      <Badge tone="blue">现在</Badge>
                      <VideoPreview url={item.after_url} label="现在" orientation="portrait" showLabel={false} />
                      <VideoUrlInput
                        value={item.after_url}
                        placeholder="现在的视频链接"
                        inputClassName="h-10 rounded-pill px-3 text-xs"
                        copyable
                        onCopy={copyVideoUrl}
                        onSave={(value) => updateCompare(item.id, { after_url: value || null })}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {activeTab === "inspiration" ? (
        <section className="space-y-4">
          <div className="flex justify-end">
            <Button variant="pink" onClick={addInspiration} disabled={busyAction === "inspiration"}>
              {busyAction === "inspiration" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              收藏灵感
            </Button>
          </div>
          {inspiration.length === 0 ? (
            <EmptyJazzCard
              title="还没有灵感收藏"
              action="收藏灵感"
              onClick={addInspiration}
              busy={busyAction === "inspiration"}
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {inspiration.map((item) => (
                <Card key={item.id} className="overflow-hidden bg-white/90">
                  <CardContent className="flex h-full flex-col gap-3 p-3">
                    <EditableText
                      aria-label="灵感标题"
                      value={item.note}
                      onSave={(value) => updateInspiration(item.id, { note: value || "想学这个感觉" })}
                      inputClassName="font-display text-lg font-extrabold leading-tight text-ink"
                    />
                    <VideoPreview
                      url={item.video_url}
                      label="灵感"
                      orientation="portrait"
                      showLabel={false}
                      className="shadow-milk"
                    />
                    <VideoUrlInput
                      value={item.video_url}
                      placeholder="想学的视频链接"
                      inputClassName="h-10 rounded-pill px-3 text-xs"
                      copyable
                      onCopy={copyVideoUrl}
                      onSave={(value) => updateInspiration(item.id, { video_url: value || null })}
                    />
                    <div className="mt-auto space-y-2 border-t border-line/80 pt-3">
                      <div className="flex items-center justify-between gap-2">
                        <VisibilityButton
                          compact
                          value={item.visibility}
                          onChange={(visibility) => updateInspiration(item.id, { visibility })}
                        />
                        <Button
                          variant="danger"
                          size="icon"
                          className="h-8 w-8"
                          aria-label="删除"
                          onClick={() => deleteRow("jazz_inspiration", item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <Button
                        variant="softBlue"
                        className="w-full"
                        onClick={() => setAsGoal(item)}
                        disabled={busyAction === "goal"}
                      >
                        {busyAction === "goal" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Goal className="h-4 w-4" />}
                        设为目标
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      ) : null}
    </div>
  );
}

function EmptyJazzCard({
  title,
  action,
  onClick,
  busy = false,
}: {
  title: string;
  action: string;
  onClick: () => void;
  busy?: boolean;
}) {
  return (
    <Card className="border-grape-line bg-grape-soft/35">
      <CardContent className="p-8 text-center">
        <CardTitle>{title}</CardTitle>
        <Button className="mt-5" onClick={onClick} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {action}
        </Button>
      </CardContent>
    </Card>
  );
}
