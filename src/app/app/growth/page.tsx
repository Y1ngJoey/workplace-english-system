"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { PageHeading } from "@/components/page-heading";
import { useToast } from "@/components/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { todayKey } from "@/lib/dates";
import { supabase } from "@/lib/supabase";
import type { GrowthLog } from "@/lib/types";

const typeLabels: Record<string, string> = {
  recording: "录音/视频",
  milestone: "里程碑",
  reflection: "反思",
};

const emptyGrowthForm = {
  log_date: todayKey(),
  type: "recording",
  title: "",
  media_url: "",
  notes: "",
};

export default function GrowthPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [logs, setLogs] = useState<GrowthLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyGrowthForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!supabase || !user) {
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("growth_log")
      .select("*")
      .eq("user_id", user.id)
      .order("log_date", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "成长记录读取失败", description: error.message, tone: "error" });
    } else {
      setLogs((data ?? []) as GrowthLog[]);
    }
    setLoading(false);
  }, [toast, user]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveLog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !user) {
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("growth_log").insert({
      user_id: user.id,
      log_date: form.log_date,
      type: form.type,
      title: form.title.trim(),
      media_url: form.media_url.trim() || null,
      notes: form.notes.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast({ title: "保存失败", description: error.message, tone: "error" });
      return;
    }
    setDialogOpen(false);
    setForm(emptyGrowthForm);
    toast({ title: "成长记录已保存", tone: "success" });
    await load();
  }

  async function deleteLog(log: GrowthLog) {
    if (!supabase || !confirm("删除这条成长记录？")) {
      return;
    }
    const { error } = await supabase.from("growth_log").delete().eq("id", log.id);
    if (error) {
      toast({ title: "删除失败", description: error.message, tone: "error" });
      return;
    }
    await load();
  }

  return (
    <div>
      <PageHeading
        title="成长记录"
        description="把录音链接、里程碑和复盘反思保存下来，方便以后看到自己怎么变稳。"
        action={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            新增记录
          </Button>
        }
      />

      {loading ? (
        <div className="flex min-h-72 items-center justify-center text-ink-2">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          正在读取成长记录
        </div>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="font-display text-2xl font-extrabold text-ink">还没有成长记录</p>
            <p className="mt-2 text-sm text-slate">从一次口语录音或一个小里程碑开始。</p>
            <Button className="mt-5" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              新增记录
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {logs.map((log) => (
            <Card key={log.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Badge tone={log.type === "milestone" ? "pink" : "blue"}>
                      {typeLabels[log.type ?? "reflection"] ?? log.type}
                    </Badge>
                    <CardTitle className="mt-3">{log.title}</CardTitle>
                    <p className="mt-1 text-sm font-bold text-slate">{log.log_date}</p>
                  </div>
                  <Button variant="danger" size="icon" aria-label="删除成长记录" onClick={() => deleteLog(log)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {log.media_url ? (
                  <a className="break-all text-sm font-bold text-blue-deep hover:underline" href={log.media_url} target="_blank">
                    {log.media_url}
                  </a>
                ) : null}
                {log.notes ? <p className="whitespace-pre-wrap text-sm leading-7 text-ink-2">{log.notes}</p> : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增成长记录</DialogTitle>
            <DialogDescription>录音链接、里程碑和反思都会存到 Supabase。</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={saveLog}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date">日期</Label>
                <Input
                  id="date"
                  type="date"
                  value={form.log_date}
                  onChange={(event) => setForm((prev) => ({ ...prev, log_date: event.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>类型</Label>
                <Select value={form.type} onValueChange={(value) => setForm((prev) => ({ ...prev, type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recording">录音/视频</SelectItem>
                    <SelectItem value="milestone">里程碑</SelectItem>
                    <SelectItem value="reflection">反思</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">标题</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="media">录音/视频链接</Label>
              <Input
                id="media"
                value={form.media_url}
                onChange={(event) => setForm((prev) => ({ ...prev, media_url: event.target.value }))}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">备注</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                保存
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
