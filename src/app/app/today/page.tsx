"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BookOpenCheck, CheckCircle2, Clock3, Loader2, NotebookTabs } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/toast-provider";
import { addDays, getWeekStartKey, todayKey } from "@/lib/dates";
import { supabase } from "@/lib/supabase";
import { getDefaultTaskType, taskLabels } from "@/lib/tasks";
import type { DailyLog, UserSettings, WeeklyReview } from "@/lib/types";
import { safeNumber } from "@/lib/utils";

type DashboardState = {
  todayLog: DailyLog | null;
  settings: UserSettings | null;
  streak: number;
  todayMinutes: number;
  dueCount: number;
  weeklyReview: WeeklyReview | null;
};

function StatCard({
  title,
  value,
  tone,
  icon,
  footer,
}: {
  title: string;
  value: string | number;
  tone: "pink" | "blue";
  icon: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-slate">{title}</p>
          <div className={tone === "pink" ? "text-pink-deep" : "text-blue-deep"}>{icon}</div>
        </div>
        <div className={tone === "pink" ? "text-5xl font-black text-pink-deep" : "text-5xl font-black text-blue-deep"}>
          {value}
        </div>
        {footer ? <div className="mt-4">{footer}</div> : null}
      </CardContent>
    </Card>
  );
}

function computeStreak(logs: Pick<DailyLog, "log_date">[]) {
  const completed = new Set(logs.map((log) => log.log_date));
  const today = todayKey();
  let cursor = completed.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (completed.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export default function TodayPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [state, setState] = useState<DashboardState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [minutes, setMinutes] = useState(30);

  const taskType = useMemo(() => getDefaultTaskType(), []);
  const today = todayKey();
  const weekStart = getWeekStartKey();

  const load = useCallback(async () => {
    if (!supabase || !user) {
      return;
    }
    setLoading(true);

    await supabase
      .from("user_settings")
      .upsert({ user_id: user.id, daily_goal_minutes: 60 }, { onConflict: "user_id", ignoreDuplicates: true });

    const [settingsResult, todayLogResult, streakResult, minutesResult, dueResult, reviewResult] = await Promise.all([
      supabase.from("user_settings").select("*").eq("user_id", user.id).single(),
      supabase
        .from("daily_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("log_date", today)
        .eq("task_type", taskType)
        .maybeSingle(),
      supabase
        .from("daily_logs")
        .select("log_date")
        .eq("user_id", user.id)
        .eq("completed", true)
        .order("log_date", { ascending: false })
        .limit(120),
      supabase.from("daily_logs").select("minutes_spent").eq("user_id", user.id).eq("log_date", today),
      supabase
        .from("corpus_entries")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .lte("next_review_at", new Date().toISOString()),
      supabase.from("weekly_reviews").select("*").eq("user_id", user.id).eq("week_start", weekStart).maybeSingle(),
    ]);

    if (settingsResult.error || todayLogResult.error || streakResult.error || minutesResult.error || dueResult.error || reviewResult.error) {
      toast({
        title: "今日数据读取失败",
        description:
          settingsResult.error?.message ||
          todayLogResult.error?.message ||
          streakResult.error?.message ||
          minutesResult.error?.message ||
          dueResult.error?.message ||
          reviewResult.error?.message,
        tone: "error",
      });
    }

    const totalMinutes = (minutesResult.data ?? []).reduce(
      (sum, log) => sum + safeNumber(log.minutes_spent),
      0,
    );
    const nextTodayLog = todayLogResult.data ?? null;
    setState({
      todayLog: nextTodayLog,
      settings: settingsResult.data ?? null,
      streak: computeStreak((streakResult.data ?? []) as Pick<DailyLog, "log_date">[]),
      todayMinutes: totalMinutes,
      dueCount: dueResult.count ?? 0,
      weeklyReview: reviewResult.data ?? null,
    });
    setMinutes(safeNumber(nextTodayLog?.minutes_spent, 30));
    setLoading(false);
  }, [taskType, today, toast, user, weekStart]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveTask(completed: boolean) {
    if (!supabase || !user) {
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("daily_logs").upsert(
      {
        user_id: user.id,
        log_date: today,
        task_type: taskType,
        completed,
        minutes_spent: Math.max(0, minutes),
      },
      { onConflict: "user_id,log_date,task_type" },
    );
    setSaving(false);

    if (error) {
      toast({ title: "打卡失败", description: error.message, tone: "error" });
      return;
    }
    toast({ title: completed ? "今日已打卡" : "已取消打卡", tone: "success" });
    await load();
  }

  const goal = safeNumber(state?.settings?.daily_goal_minutes, 60);
  const progress = Math.min(100, Math.round((safeNumber(state?.todayMinutes) / Math.max(goal, 1)) * 100));

  if (loading || !state) {
    return (
      <div className="flex min-h-72 items-center justify-center text-ink-2">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        正在读取今日练习
      </div>
    );
  }

  return (
    <div>
      <PageHeading title="今日" description="先把今天这一小步练扎实，再去复盘和积累语料。" />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="连续打卡"
          value={state.streak}
          tone="pink"
          icon={<CheckCircle2 className="h-5 w-5" />}
          footer={<Badge tone="pink">天</Badge>}
        />
        <StatCard
          title="今日分钟"
          value={state.todayMinutes}
          tone="blue"
          icon={<Clock3 className="h-5 w-5" />}
          footer={
            <div>
              <div className="h-2 overflow-hidden rounded-pill bg-blue-soft">
                <div className="h-full rounded-pill bg-blue" style={{ width: `${progress}%` }} />
              </div>
              <p className="mt-2 text-xs font-bold text-blue-deep">{progress}% / 目标 {goal} 分钟</p>
            </div>
          }
        />
        <StatCard
          title="待复习语料"
          value={state.dueCount}
          tone="blue"
          icon={<BookOpenCheck className="h-5 w-5" />}
          footer={
            <Button asChild variant="softBlue" size="sm">
              <Link href="/app/corpus">去复习</Link>
            </Button>
          }
        />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>今日任务</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[18px] border border-pink-line bg-pink-soft p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Badge tone="pink">轮换任务</Badge>
                  <p className="mt-3 font-display text-2xl font-extrabold text-ink">{taskLabels[taskType]}</p>
                </div>
                <label className="flex items-center gap-3 rounded-pill bg-white px-4 py-3 text-sm font-bold text-ink-2 shadow-sm">
                  <input
                    type="checkbox"
                    className="h-5 w-5 accent-pink-deep"
                    checked={Boolean(state.todayLog?.completed)}
                    onChange={(event) => saveTask(event.target.checked)}
                    disabled={saving}
                  />
                  已完成
                </label>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <div>
                <label className="mb-2 block text-sm font-bold text-ink">练习分钟</label>
                <Input
                  type="number"
                  min={0}
                  value={minutes}
                  onChange={(event) => setMinutes(Number(event.target.value))}
                />
              </div>
              <Button onClick={() => saveTask(true)} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                保存打卡
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>本周复盘</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[18px] border border-blue-line bg-blue-soft p-4">
              <Badge tone={state.weeklyReview ? "pink" : "blue"}>{state.weeklyReview ? "已创建" : "待创建"}</Badge>
              <p className="mt-3 text-sm leading-6 text-blue-deep">
                本周从 {weekStart} 开始。复盘条目支持自由编辑和拖拽排序。
              </p>
            </div>
            <Button asChild variant="blue">
              <Link href="/app/weekly">
                <NotebookTabs className="h-4 w-4" />
                打开每周复盘
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
