"use client";

import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, FileDown, Loader2, LogOut, Save, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { PageHeading } from "@/components/page-heading";
import { useToast } from "@/components/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import type { Database, UserSettings } from "@/lib/types";
import { todayKey } from "@/lib/dates";
import { safeNumber } from "@/lib/utils";

type TableName = keyof Database["public"]["Tables"];

const exportTables = [
  "corpus_entries",
  "weekly_reviews",
  "review_items",
  "daily_logs",
  "templates",
  "glossary",
  "roleplay_scripts",
  "growth_log",
  "grammar_practice",
  "idea_bank",
  "trips",
  "places",
  "place_media",
] as const satisfies readonly TableName[];

const csvTables = ["corpus_entries", "daily_logs", "weekly_reviews"] as const satisfies readonly TableName[];

function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function toCsv(rows: Record<string, unknown>[]) {
  if (rows.length === 0) {
    return "";
  }
  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
  const escape = (value: unknown) => {
    if (value === null || value === undefined) return "";
    const text = typeof value === "object" ? JSON.stringify(value) : String(value);
    return `"${text.replaceAll('"', '""')}"`;
  };
  return [headers.join(","), ...rows.map((row) => headers.map((header) => escape(row[header])).join(","))].join("\n");
}

export default function SettingsPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [goal, setGoal] = useState(60);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!supabase || !user) {
      return;
    }
    setLoading(true);
    await supabase
      .from("user_settings")
      .upsert({ user_id: user.id, daily_goal_minutes: 60 }, { onConflict: "user_id", ignoreDuplicates: true });
    const { data, error } = await supabase.from("user_settings").select("*").eq("user_id", user.id).single();
    if (error) {
      toast({ title: "设置读取失败", description: error.message, tone: "error" });
    } else {
      setSettings(data as UserSettings);
      setGoal(safeNumber(data.daily_goal_minutes, 60));
    }
    setLoading(false);
  }, [toast, user]);

  useEffect(() => {
    void load();
  }, [load]);

  const backupHint = useMemo(() => {
    if (!settings?.last_export_at) {
      return "还没有导出过，建议今天先备份一次。";
    }
    const last = new Date(settings.last_export_at);
    const days = Math.floor((Date.now() - last.getTime()) / 86400000);
    return days > 7 ? `距离上次导出已经 ${days} 天，今天适合备份。` : `上次导出在 ${days} 天前。`;
  }, [settings?.last_export_at]);

  async function saveGoal() {
    if (!supabase || !user) {
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("user_settings")
      .upsert({ user_id: user.id, daily_goal_minutes: Math.max(0, goal) }, { onConflict: "user_id" });
    setBusy(false);
    if (error) {
      toast({ title: "目标保存失败", description: error.message, tone: "error" });
      return;
    }
    toast({ title: "每日目标已保存", tone: "success" });
    await load();
  }

  async function exportJson() {
    if (!supabase || !user) {
      return;
    }
    setBusy(true);
    const tables: Record<string, unknown[]> = {};
    for (const table of exportTables) {
      const { data, error } = await supabase.from(table).select("*").eq("user_id", user.id);
      if (error) {
        setBusy(false);
        toast({ title: "导出失败", description: `${table}: ${error.message}`, tone: "error" });
        return;
      }
      tables[table] = data ?? [];
    }
    const settingsResult = await supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle();
    if (settingsResult.error) {
      setBusy(false);
      toast({ title: "导出设置失败", description: settingsResult.error.message, tone: "error" });
      return;
    }
    const exportedAt = new Date().toISOString();
    const payload = {
      app: "personal-domain",
      version: 1,
      exported_at: exportedAt,
      user_id: user.id,
      settings: settingsResult.data,
      tables,
    };
    downloadFile(`personal-domain-backup-${todayKey()}.json`, JSON.stringify(payload, null, 2), "application/json");
    await supabase.from("user_settings").update({ last_export_at: exportedAt }).eq("user_id", user.id);
    setBusy(false);
    toast({ title: "JSON 已导出", tone: "success" });
    await load();
  }

  async function exportCsv() {
    if (!supabase || !user) {
      return;
    }
    setBusy(true);
    for (const table of csvTables) {
      const { data, error } = await supabase.from(table).select("*").eq("user_id", user.id);
      if (error) {
        setBusy(false);
        toast({ title: "CSV 导出失败", description: `${table}: ${error.message}`, tone: "error" });
        return;
      }
      downloadFile(`${table}-${todayKey()}.csv`, toCsv((data ?? []) as Record<string, unknown>[]), "text/csv;charset=utf-8");
    }
    setBusy(false);
    toast({ title: "关键 CSV 已导出", tone: "success" });
  }

  async function importJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !supabase || !user) {
      return;
    }
    setBusy(true);
    try {
      const payload = JSON.parse(await file.text()) as {
        settings?: Record<string, unknown>;
        tables?: Record<string, Record<string, unknown>[]>;
      };
      if (payload.settings) {
        await supabase
          .from("user_settings")
          .upsert({ ...payload.settings, user_id: user.id }, { onConflict: "user_id" });
      }
      for (const table of exportTables) {
        const rows = payload.tables?.[table] ?? [];
        if (rows.length === 0) continue;
        const restoredRows = rows.map((row) => ({ ...row, user_id: user.id }));
        const { error } = await supabase.from(table).upsert(restoredRows);
        if (error) {
          throw new Error(`${table}: ${error.message}`);
        }
      }
      toast({ title: "导入完成", description: "已按当前账号恢复数据。", tone: "success" });
      await load();
    } catch (error) {
      toast({ title: "导入失败", description: error instanceof Error ? error.message : "无法解析备份文件", tone: "error" });
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  async function signOut() {
    if (!supabase) {
      return;
    }
    await supabase.auth.signOut();
    router.replace("/");
  }

  if (loading || !settings) {
    return (
      <div className="flex min-h-72 items-center justify-center text-ink-2">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        正在读取设置
      </div>
    );
  }

  return (
    <div>
      <PageHeading title="设置" description="控制每日目标、导出备份和账号退出。" />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>每日目标</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="goal">目标分钟</Label>
              <Input id="goal" type="number" min={0} value={goal} onChange={(event) => setGoal(Number(event.target.value))} />
            </div>
            <Button onClick={saveGoal} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              保存目标
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>备份与恢复</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[18px] border border-blue-line bg-blue-soft p-4 text-sm font-bold text-blue-deep">
              {backupHint}
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={exportJson} disabled={busy}>
                <Download className="h-4 w-4" />
                导出 JSON
              </Button>
              <Button variant="softBlue" onClick={exportCsv} disabled={busy}>
                <FileDown className="h-4 w-4" />
                关键 CSV
              </Button>
              <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={busy}>
                <Upload className="h-4 w-4" />
                导入 JSON
              </Button>
              <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={importJson} />
            </div>
            <p className="text-xs leading-5 text-slate">导入时会把备份中的 user_id 改成当前账号，避免误写到旧账号。</p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>账号</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Badge tone="pink">已登录</Badge>
              <p className="mt-2 text-sm font-bold text-ink-2">{user?.email}</p>
            </div>
            <Button variant="danger" onClick={signOut}>
              <LogOut className="h-4 w-4" />
              退出登录
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
