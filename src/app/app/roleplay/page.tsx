"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Copy, Heart, Loader2, Plus, Trash2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/lib/supabase";
import type { RoleplayScript } from "@/lib/types";
import { cn } from "@/lib/utils";

const categoryLabels: Record<string, string> = {
  setup: "开场咒语",
  reception: "接待",
  fair: "展会",
  meeting: "会议",
  negotiation: "谈判",
  followup: "跟进",
  presentation: "演讲",
  improv: "救场",
  supplier: "供应商",
  custom: "自定义",
};

const emptyScript = {
  category: "custom",
  title: "",
  content_en: "",
  content_zh: "",
};

export default function RoleplayPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [scripts, setScripts] = useState<RoleplayScript[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyScript);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!supabase) {
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("roleplay_scripts")
      .select("*")
      .order("category", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) {
      toast({ title: "剧本读取失败", description: error.message, tone: "error" });
    } else {
      setScripts((data ?? []) as RoleplayScript[]);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const setupScript = useMemo(() => scripts.find((script) => script.category === "setup"), [scripts]);
  const scenarioScripts = useMemo(
    () => scripts.filter((script) => script.category !== "setup"),
    [scripts],
  );

  async function copyScript(script: RoleplayScript) {
    await navigator.clipboard.writeText(script.content_en);
    toast({ title: "已复制", description: script.title, tone: "success" });
  }

  async function favoriteScript(script: RoleplayScript) {
    if (!supabase || !user) {
      return;
    }

    if (script.user_id === user.id) {
      const { error } = await supabase
        .from("roleplay_scripts")
        .update({ is_favorite: !script.is_favorite })
        .eq("id", script.id);
      if (error) {
        toast({ title: "收藏失败", description: error.message, tone: "error" });
        return;
      }
      await load();
      return;
    }

    const { error } = await supabase.from("roleplay_scripts").insert({
      user_id: user.id,
      category: script.category,
      title: script.title,
      content_en: script.content_en,
      content_zh: script.content_zh,
      is_favorite: true,
    });
    if (error) {
      toast({ title: "收藏失败", description: error.message, tone: "error" });
      return;
    }
    toast({ title: "已收藏为你的剧本", tone: "success" });
    await load();
  }

  async function deleteScript(script: RoleplayScript) {
    if (!supabase || script.user_id !== user?.id || !confirm("删除这个自定义剧本？")) {
      return;
    }
    const { error } = await supabase.from("roleplay_scripts").delete().eq("id", script.id);
    if (error) {
      toast({ title: "删除失败", description: error.message, tone: "error" });
      return;
    }
    await load();
  }

  async function saveCustomScript(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !user) {
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("roleplay_scripts").insert({
      user_id: user.id,
      category: form.category || "custom",
      title: form.title.trim(),
      content_en: form.content_en.trim(),
      content_zh: form.content_zh.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast({ title: "保存失败", description: error.message, tone: "error" });
      return;
    }
    setDialogOpen(false);
    setForm(emptyScript);
    toast({ title: "自定义剧本已保存", tone: "success" });
    await load();
  }

  return (
    <div>
      <PageHeading
        title="语音陪练"
        description="复制剧本到任意语音 AI 或聊天工具里练，不绑定具体工具。"
        action={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            自定义剧本
          </Button>
        }
      />

      {loading ? (
        <div className="flex min-h-72 items-center justify-center text-ink-2">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          正在读取剧本
        </div>
      ) : (
        <div className="space-y-5">
          {setupScript ? (
            <Card className="border-pink-line bg-pink-soft/40">
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <Badge tone="pink">开场咒语</Badge>
                    <CardTitle className="mt-3">{setupScript.title}</CardTitle>
                  </div>
                  <Button variant="pink" onClick={() => copyScript(setupScript)}>
                    <Copy className="h-4 w-4" />
                    复制
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap rounded-[18px] border border-pink-line bg-white p-4 text-sm leading-7 text-ink-2">
                  {setupScript.content_en}
                </pre>
              </CardContent>
            </Card>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            {scenarioScripts.map((script) => (
              <Card key={script.id} className={cn(script.is_favorite && "border-pink-line")}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Badge tone={script.user_id ? "pink" : "blue"}>
                        {categoryLabels[script.category] ?? script.category}
                      </Badge>
                      <CardTitle className="mt-3">{script.title}</CardTitle>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" aria-label="收藏剧本" onClick={() => favoriteScript(script)}>
                        <Heart className={cn("h-4 w-4", script.is_favorite && "fill-pink text-pink-deep")} />
                      </Button>
                      {script.user_id === user?.id ? (
                        <Button variant="danger" size="icon" aria-label="删除剧本" onClick={() => deleteScript(script)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="line-clamp-[8] text-sm leading-7 text-ink-2">{script.content_en}</p>
                  <Button variant="softBlue" onClick={() => copyScript(script)}>
                    <Copy className="h-4 w-4" />
                    复制
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>自定义剧本</DialogTitle>
            <DialogDescription>保存后会作为你的私人剧本显示在列表里。</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={saveCustomScript}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">分类</Label>
                <Input
                  id="category"
                  value={form.category}
                  onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                />
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
            </div>
            <div className="space-y-2">
              <Label htmlFor="content_en">英文剧本</Label>
              <Textarea
                id="content_en"
                value={form.content_en}
                onChange={(event) => setForm((prev) => ({ ...prev, content_en: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="content_zh">中文备注</Label>
              <Textarea
                id="content_zh"
                value={form.content_zh}
                onChange={(event) => setForm((prev) => ({ ...prev, content_zh: event.target.value }))}
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
