"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
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

function getErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return error instanceof Error ? error.message : "请稍后再试一次。";
}

function VisibilityButton({
  value,
  onChange,
}: {
  value: Visibility;
  onChange: (visibility: Visibility) => Promise<void>;
}) {
  const nextValue = value === "private" ? "public" : "private";
  return (
    <Button
      variant={value === "private" ? "outline" : "softBlue"}
      size="sm"
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
}: {
  value: string | null;
  onSave: (value: string) => Promise<void>;
  placeholder: string;
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

  return (
    <div className="relative">
      <Input value={draft} onChange={(event) => setDraft(event.target.value)} onBlur={save} placeholder={placeholder} />
      {saving ? <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-blue-deep" /> : null}
    </div>
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
            <div className="space-y-4">
              {timeline.map((item, index) => (
                <Card key={item.id} className="border-grape-line/70">
                  <CardContent className="grid gap-5 p-5 lg:grid-cols-[12rem_1fr]">
                    <div className="space-y-3">
                      <Input
                        type="date"
                        value={item.entry_date}
                        onChange={(event) => updateTimeline(item.id, { entry_date: event.target.value })}
                      />
                      <VisibilityButton value={item.visibility} onChange={(visibility) => updateTimeline(item.id, { visibility })} />
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" aria-label="上移" onClick={() => moveTimeline(item, -1)} disabled={index === 0}>
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="下移"
                          onClick={() => moveTimeline(item, 1)}
                          disabled={index === timeline.length - 1}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button variant="danger" size="icon" aria-label="删除" onClick={() => deleteRow("jazz_timeline", item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <EditableText
                        aria-label="时间线标题"
                        value={item.title}
                        onSave={(value) => updateTimeline(item.id, { title: value || "未命名记录" })}
                        inputClassName="font-display text-2xl font-extrabold text-ink"
                      />
                      <EditableText
                        aria-label="时间线正文"
                        value={item.note}
                        onSave={(value) => updateTimeline(item.id, { note: value })}
                        multiline
                        inputClassName="text-sm leading-7 text-ink-2"
                      />
                      <VideoUrlInput
                        value={item.video_url}
                        placeholder="粘贴 YouTube / B站 / 小红书视频链接"
                        onSave={(value) => updateTimeline(item.id, { video_url: value || null })}
                      />
                      <VideoPreview url={item.video_url} label="时间线视频" />
                    </div>
                  </CardContent>
                </Card>
              ))}
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
            <div className="grid gap-4">
              {compare.map((item) => (
                <Card key={item.id}>
                  <CardHeader>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <EditableText
                        aria-label="对比标题"
                        value={item.title}
                        onSave={(value) => updateCompare(item.id, { title: value || "未命名对比" })}
                        inputClassName="font-display text-2xl font-extrabold text-ink"
                      />
                      <div className="flex shrink-0 gap-2">
                        <VisibilityButton value={item.visibility} onChange={(visibility) => updateCompare(item.id, { visibility })} />
                        <Button variant="danger" size="icon" aria-label="删除" onClick={() => deleteRow("jazz_compare", item.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-4 lg:grid-cols-2">
                    <div className="space-y-3">
                      <Badge tone="pink">以前</Badge>
                      <VideoUrlInput
                        value={item.before_url}
                        placeholder="以前的视频链接"
                        onSave={(value) => updateCompare(item.id, { before_url: value || null })}
                      />
                      <VideoPreview url={item.before_url} label="以前" />
                    </div>
                    <div className="space-y-3">
                      <Badge tone="blue">现在</Badge>
                      <VideoUrlInput
                        value={item.after_url}
                        placeholder="现在的视频链接"
                        onSave={(value) => updateCompare(item.id, { after_url: value || null })}
                      />
                      <VideoPreview url={item.after_url} label="现在" />
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
            <div className="grid gap-4 md:grid-cols-2">
              {inspiration.map((item) => (
                <Card key={item.id}>
                  <CardContent className="space-y-4 p-5">
                    <div className="flex justify-between gap-2">
                      <VisibilityButton value={item.visibility} onChange={(visibility) => updateInspiration(item.id, { visibility })} />
                      <Button variant="danger" size="icon" aria-label="删除" onClick={() => deleteRow("jazz_inspiration", item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <VideoUrlInput
                      value={item.video_url}
                      placeholder="想学的视频/想编的歌链接"
                      onSave={(value) => updateInspiration(item.id, { video_url: value || null })}
                    />
                    <VideoPreview url={item.video_url} label="灵感" />
                    <EditableText
                      aria-label="灵感备注"
                      value={item.note}
                      onSave={(value) => updateInspiration(item.id, { note: value })}
                      multiline
                      inputClassName="text-sm leading-7 text-ink-2"
                    />
                    <Input
                      value={(item.tags ?? []).join(", ")}
                      onChange={(event) =>
                        setInspiration((current) =>
                          current.map((row) =>
                            row.id === item.id
                              ? { ...row, tags: event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) }
                              : row,
                          ),
                        )
                      }
                      onBlur={(event) =>
                        updateInspiration(item.id, {
                          tags: event.target.value
                            .split(",")
                            .map((tag) => tag.trim())
                            .filter(Boolean),
                        })
                      }
                      placeholder="标签，逗号分隔"
                    />
                    <Button variant="softBlue" onClick={() => setAsGoal(item)} disabled={busyAction === "goal"}>
                      {busyAction === "goal" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Goal className="h-4 w-4" />}
                      设为目标
                    </Button>
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
