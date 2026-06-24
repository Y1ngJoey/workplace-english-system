"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Loader2, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { PageHeading } from "@/components/page-heading";
import { useToast } from "@/components/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { addDays, getWeekEnd, getWeekStartKey, toDateKey } from "@/lib/dates";
import { supabase } from "@/lib/supabase";
import type { ReviewItem, ReviewSection, WeeklyReview } from "@/lib/types";
import { cn, safeNumber } from "@/lib/utils";

const sectionMeta: Record<ReviewSection, { label: string; short: string }> = {
  learned: { label: "本周学到的表达", short: "学到" },
  used: { label: "实战用上的", short: "用上" },
  mistakes: { label: "错误 → 纠正", short: "纠错" },
  hard: { label: "难点", short: "难点" },
  next: { label: "下周主攻", short: "下周" },
};

const defaultSections: ReviewSection[] = ["learned", "used", "mistakes", "hard", "next"];

type Summary = Pick<WeeklyReview, "corpus_added" | "days_completed" | "emails_written" | "interpreting_sessions">;

function SortableReviewItem({
  item,
  onContentChange,
  onDelete,
}: {
  item: ReviewItem;
  onContentChange: (itemId: string, content: string) => Promise<void>;
  onDelete: (item: ReviewItem) => Promise<void>;
}) {
  const [content, setContent] = useState(item.content);
  const [saving, setSaving] = useState(false);
  const dirtyRef = useRef(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  useEffect(() => {
    setContent(item.content);
    dirtyRef.current = false;
  }, [item.content, item.id]);

  useEffect(() => {
    if (!dirtyRef.current) {
      return;
    }
    const timer = window.setTimeout(async () => {
      setSaving(true);
      await onContentChange(item.id, content);
      setSaving(false);
      dirtyRef.current = false;
    }, 700);
    return () => window.clearTimeout(timer);
  }, [content, item.id, onContentChange]);

  async function flushSave() {
    if (!dirtyRef.current) {
      return;
    }
    setSaving(true);
    await onContentChange(item.id, content);
    setSaving(false);
    dirtyRef.current = false;
  }

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        "grid grid-cols-[auto_1fr_auto] gap-2 rounded-[16px] border border-line bg-white p-3 shadow-sm",
        isDragging && "border-pink bg-pink-soft/80",
      )}
    >
      <button
        className="mt-2 inline-flex h-9 w-9 cursor-grab items-center justify-center rounded-pill text-slate hover:bg-line-2 active:cursor-grabbing"
        aria-label="拖拽排序"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <Textarea
        value={content}
        onChange={(event) => {
          dirtyRef.current = true;
          setContent(event.target.value);
        }}
        onBlur={flushSave}
        className="min-h-16 border-0 bg-line-2/55 shadow-none focus:bg-white"
        placeholder="写一条复盘..."
      />
      <div className="flex flex-col items-center gap-2">
        {saving ? <Loader2 className="mt-3 h-4 w-4 animate-spin text-blue-deep" /> : null}
        <Button variant="danger" size="icon" aria-label="删除条目" onClick={() => onDelete(item)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function WeeklyPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [weekStart, setWeekStart] = useState(getWeekStartKey());
  const [review, setReview] = useState<WeeklyReview | null>(null);
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [summary, setSummary] = useState<Summary>({
    corpus_added: 0,
    days_completed: 0,
    emails_written: 0,
    interpreting_sessions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [savingSummary, setSavingSummary] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const sections = useMemo(() => {
    const order = review?.section_order?.filter((section): section is ReviewSection =>
      defaultSections.includes(section as ReviewSection),
    );
    return order?.length ? order : defaultSections;
  }, [review?.section_order]);

  const groupedItems = useMemo(() => {
    return sections.reduce<Record<ReviewSection, ReviewItem[]>>(
      (acc, section) => {
        acc[section] = items
          .filter((item) => item.section === section)
          .sort((a, b) => a.position - b.position);
        return acc;
      },
      {
        learned: [],
        used: [],
        mistakes: [],
        hard: [],
        next: [],
      },
    );
  }, [items, sections]);

  const computeSummary = useCallback(async () => {
    if (!supabase || !user) {
      return {
        corpus_added: 0,
        days_completed: 0,
        emails_written: 0,
        interpreting_sessions: 0,
      };
    }
    const weekEnd = toDateKey(getWeekEnd(weekStart));
    const startIso = `${weekStart}T00:00:00.000Z`;
    const afterEnd = `${addDays(weekEnd, 1)}T00:00:00.000Z`;

    const [corpusResult, logsResult] = await Promise.all([
      supabase
        .from("corpus_entries")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", startIso)
        .lt("created_at", afterEnd),
      supabase
        .from("daily_logs")
        .select("log_date, task_type")
        .eq("user_id", user.id)
        .eq("completed", true)
        .gte("log_date", weekStart)
        .lte("log_date", weekEnd),
    ]);

    if (corpusResult.error || logsResult.error) {
      toast({
        title: "汇总计算失败",
        description: corpusResult.error?.message || logsResult.error?.message,
        tone: "error",
      });
    }

    const logs = logsResult.data ?? [];
    return {
      corpus_added: corpusResult.count ?? 0,
      days_completed: new Set(logs.map((log) => log.log_date)).size,
      emails_written: logs.filter((log) => log.task_type === "email").length,
      interpreting_sessions: logs.filter((log) => log.task_type === "interpreting").length,
    };
  }, [toast, user, weekStart]);

  const load = useCallback(async () => {
    if (!supabase || !user) {
      return;
    }
    setLoading(true);
    const nextSummary = await computeSummary();
    const reviewResult = await supabase
      .from("weekly_reviews")
      .select("*")
      .eq("user_id", user.id)
      .eq("week_start", weekStart)
      .maybeSingle();

    if (reviewResult.error) {
      toast({ title: "复盘读取失败", description: reviewResult.error.message, tone: "error" });
      setLoading(false);
      return;
    }

    let nextReview = reviewResult.data as WeeklyReview | null;
    if (!nextReview) {
      const insertResult = await supabase
        .from("weekly_reviews")
        .insert({
          user_id: user.id,
          week_start: weekStart,
          ...nextSummary,
          section_order: defaultSections,
        })
        .select()
        .single();
      if (insertResult.error) {
        toast({ title: "创建本周复盘失败", description: insertResult.error.message, tone: "error" });
        setLoading(false);
        return;
      }
      nextReview = insertResult.data as WeeklyReview;
    }

    const itemsResult = await supabase
      .from("review_items")
      .select("*")
      .eq("review_id", nextReview.id)
      .order("section", { ascending: true })
      .order("position", { ascending: true });

    if (itemsResult.error) {
      toast({ title: "复盘条目读取失败", description: itemsResult.error.message, tone: "error" });
      setLoading(false);
      return;
    }

    let nextItems = (itemsResult.data ?? []) as ReviewItem[];
    if (nextItems.length === 0) {
      const defaults = defaultSections.map((section) => ({
        user_id: user.id,
        review_id: nextReview!.id,
        section,
        content: "",
        position: 0,
      }));
      const defaultsResult = await supabase.from("review_items").insert(defaults).select();
      if (defaultsResult.error) {
        toast({ title: "默认复盘条目创建失败", description: defaultsResult.error.message, tone: "error" });
      } else {
        nextItems = (defaultsResult.data ?? []) as ReviewItem[];
      }
    }

    setReview(nextReview);
    setItems(nextItems);
    setSummary({
      corpus_added: nextReview.corpus_added,
      days_completed: nextReview.days_completed,
      emails_written: nextReview.emails_written,
      interpreting_sessions: nextReview.interpreting_sessions,
    });
    setLoading(false);
  }, [computeSummary, toast, user, weekStart]);

  useEffect(() => {
    void load();
  }, [load]);

  async function refreshSummary() {
    if (!review || !supabase) {
      return;
    }
    const nextSummary = await computeSummary();
    setSummary(nextSummary);
    const { error } = await supabase.from("weekly_reviews").update(nextSummary).eq("id", review.id);
    if (error) {
      toast({ title: "汇总保存失败", description: error.message, tone: "error" });
      return;
    }
    toast({ title: "汇总已按本周数据刷新", tone: "success" });
    await load();
  }

  async function saveSummary() {
    if (!review || !supabase) {
      return;
    }
    setSavingSummary(true);
    const { error } = await supabase.from("weekly_reviews").update(summary).eq("id", review.id);
    setSavingSummary(false);
    if (error) {
      toast({ title: "汇总保存失败", description: error.message, tone: "error" });
      return;
    }
    toast({ title: "汇总已保存", tone: "success" });
  }

  const updateItemContent = useCallback(
    async (itemId: string, content: string) => {
      if (!supabase) {
        return;
      }
      setItems((current) => current.map((item) => (item.id === itemId ? { ...item, content } : item)));
      const { error } = await supabase.from("review_items").update({ content }).eq("id", itemId);
      if (error) {
        toast({ title: "条目保存失败", description: error.message, tone: "error" });
      }
    },
    [toast],
  );

  async function addItem(section: ReviewSection) {
    if (!supabase || !user || !review) {
      return;
    }
    const nextPosition = groupedItems[section].length;
    const { data, error } = await supabase
      .from("review_items")
      .insert({
        user_id: user.id,
        review_id: review.id,
        section,
        content: "",
        position: nextPosition,
      })
      .select()
      .single();
    if (error) {
      toast({ title: "添加条目失败", description: error.message, tone: "error" });
      return;
    }
    setItems((current) => [...current, data as ReviewItem]);
  }

  async function deleteItem(item: ReviewItem) {
    if (!supabase || !confirm("删除这条复盘？")) {
      return;
    }
    const { error } = await supabase.from("review_items").delete().eq("id", item.id);
    if (error) {
      toast({ title: "删除失败", description: error.message, tone: "error" });
      return;
    }
    const rest = items.filter((nextItem) => nextItem.id !== item.id);
    const sameSection = rest
      .filter((nextItem) => nextItem.section === item.section)
      .sort((a, b) => a.position - b.position)
      .map((nextItem, index) => ({ ...nextItem, position: index }));
    const merged = rest.map((nextItem) => sameSection.find((candidate) => candidate.id === nextItem.id) ?? nextItem);
    setItems(merged);
    await Promise.all(
      sameSection.map((nextItem) => supabase.from("review_items").update({ position: nextItem.position }).eq("id", nextItem.id)),
    );
  }

  async function handleDragEnd(section: ReviewSection, event: DragEndEvent) {
    if (!supabase || !event.over || event.active.id === event.over.id) {
      return;
    }
    const sectionItems = groupedItems[section];
    const oldIndex = sectionItems.findIndex((item) => item.id === event.active.id);
    const newIndex = sectionItems.findIndex((item) => item.id === event.over?.id);
    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    const reordered = arrayMove(sectionItems, oldIndex, newIndex).map((item, index) => ({
      ...item,
      position: index,
    }));
    setItems((current) =>
      current.map((item) => (item.section === section ? reordered.find((nextItem) => nextItem.id === item.id) ?? item : item)),
    );

    const results = await Promise.all(
      reordered.map((item) => supabase.from("review_items").update({ position: item.position }).eq("id", item.id)),
    );
    const error = results.find((result) => result.error)?.error;
    if (error) {
      toast({ title: "排序保存失败", description: error.message, tone: "error" });
      await load();
      return;
    }
    toast({ title: "顺序已保存", tone: "success" });
  }

  function updateSummaryValue(key: keyof Summary, value: string) {
    setSummary((current) => ({ ...current, [key]: Number(value) }));
  }

  if (loading || !review) {
    return (
      <div className="flex min-h-72 items-center justify-center text-ink-2">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        正在准备每周复盘
      </div>
    );
  }

  return (
    <div>
      <PageHeading
        title="每周复盘"
        description="每条都能直接编辑；拖拽后 position 写回数据库，刷新顺序仍然保持。"
      />

      <Card className="mb-5">
        <CardContent className="grid gap-4 p-4 lg:grid-cols-[auto_1fr_auto] lg:items-end">
          <div>
            <label className="mb-2 block text-sm font-bold text-ink">周一日期</label>
            <Input
              type="date"
              value={weekStart}
              onChange={(event) => setWeekStart(getWeekStartKey(new Date(`${event.target.value}T00:00:00`)))}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setWeekStart(addDays(weekStart, -7))}>
              上一周
            </Button>
            <Button variant="outline" onClick={() => setWeekStart(getWeekStartKey())}>
              本周
            </Button>
            <Button variant="outline" onClick={() => setWeekStart(addDays(weekStart, 7))}>
              下一周
            </Button>
          </div>
          <Button variant="blue" onClick={refreshSummary}>
            <RotateCcw className="h-4 w-4" />
            重新计算
          </Button>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>自动汇总</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["corpus_added", "新增语料"],
              ["days_completed", "打卡天数"],
              ["emails_written", "邮件练习"],
              ["interpreting_sessions", "口译练习"],
            ].map(([key, label]) => (
              <label key={key} className="rounded-[18px] border border-line bg-line-2/55 p-3">
                <span className="mb-2 block text-xs font-extrabold text-slate">{label}</span>
                <Input
                  type="number"
                  min={0}
                  value={safeNumber(summary[key as keyof Summary])}
                  onChange={(event) => updateSummaryValue(key as keyof Summary, event.target.value)}
                />
              </label>
            ))}
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={saveSummary} disabled={savingSummary}>
              {savingSummary ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              保存汇总
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-5">
        {sections.map((section, index) => (
          <Card key={section}>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-pill bg-pink-soft text-sm text-pink-deep">
                    {index + 1}
                  </span>
                  {sectionMeta[section].label}
                </CardTitle>
                <Badge tone="blue">{sectionMeta[section].short}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(event) => handleDragEnd(section, event)}>
                <SortableContext items={groupedItems[section].map((item) => item.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {groupedItems[section].map((item) => (
                      <SortableReviewItem
                        key={item.id}
                        item={item}
                        onContentChange={updateItemContent}
                        onDelete={deleteItem}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              <Button variant="outline" onClick={() => addItem(section)}>
                <Plus className="h-4 w-4" />
                添加一条
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
