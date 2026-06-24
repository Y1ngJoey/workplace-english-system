"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Plus, Save } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useCorpusDialog } from "@/components/corpus-dialog-context";
import { useToast } from "@/components/toast-provider";
import { Button } from "@/components/ui/button";
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
import { supabase } from "@/lib/supabase";
import type { CorpusEntry, Scenario } from "@/lib/types";

export const scenarios: Scenario[] = ["接待", "展会", "谈判", "会议", "合同", "演讲", "其他"];

type CorpusEntryDialogProps = {
  entry?: CorpusEntry | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSaved?: () => void;
};

const emptyForm = {
  scenario: "接待" as Scenario,
  chinese_intent: "",
  english_expression: "",
  mistake_note: "",
  tags: "",
  source: "",
};

export function CorpusEntryDialog({ entry, open, onOpenChange, onSaved }: CorpusEntryDialogProps = {}) {
  const context = useCorpusDialog();
  const { user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const controlled = typeof open === "boolean";
  const dialogOpen = controlled ? open : context.open;
  const setDialogOpen = controlled ? onOpenChange ?? (() => undefined) : context.setOpen;
  const mode = entry ? "edit" : "create";

  useEffect(() => {
    if (!dialogOpen) {
      return;
    }
    if (entry) {
      setForm({
        scenario: (entry.scenario as Scenario) || "接待",
        chinese_intent: entry.chinese_intent ?? "",
        english_expression: entry.english_expression,
        mistake_note: entry.mistake_note ?? "",
        tags: entry.tags?.join(", ") ?? "",
        source: entry.source ?? "",
      });
    } else {
      setForm(emptyForm);
    }
  }, [dialogOpen, entry]);

  const canSave = useMemo(() => form.english_expression.trim().length > 0, [form.english_expression]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !user || !canSave) {
      return;
    }

    setSaving(true);
    const payload = {
      user_id: user.id,
      scenario: form.scenario,
      chinese_intent: form.chinese_intent.trim() || null,
      english_expression: form.english_expression.trim(),
      mistake_note: form.mistake_note.trim() || null,
      tags: form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      source: form.source.trim() || null,
    };

    const query = entry
      ? supabase.from("corpus_entries").update(payload).eq("id", entry.id)
      : supabase.from("corpus_entries").insert(payload);

    const { error } = await query;
    setSaving(false);

    if (error) {
      toast({ title: "保存失败", description: error.message, tone: "error" });
      return;
    }

    toast({
      title: mode === "create" ? "语料已加入" : "语料已更新",
      description: "刷新后也会保留在 Supabase。",
      tone: "success",
    });
    window.dispatchEvent(new CustomEvent("corpus:changed"));
    setDialogOpen(false);
    onSaved?.();
  }

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "新增语料" : "编辑语料"}</DialogTitle>
          <DialogDescription>场景、中文意图、英文表达和错误纠正都会写入 Supabase。</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>场景</Label>
              <Select value={form.scenario} onValueChange={(value) => setForm((prev) => ({ ...prev, scenario: value as Scenario }))}>
                <SelectTrigger>
                  <SelectValue placeholder="选择场景" />
                </SelectTrigger>
                <SelectContent>
                  {scenarios.map((scenario) => (
                    <SelectItem key={scenario} value={scenario}>
                      {scenario}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="source">来源</Label>
              <Input
                id="source"
                value={form.source}
                onChange={(event) => setForm((prev) => ({ ...prev, source: event.target.value }))}
                placeholder="例：展会、会议、客户邮件"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="chinese_intent">中文意图</Label>
            <Textarea
              id="chinese_intent"
              value={form.chinese_intent}
              onChange={(event) => setForm((prev) => ({ ...prev, chinese_intent: event.target.value }))}
              placeholder="我想表达什么"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="english_expression">英文表达</Label>
            <Textarea
              id="english_expression"
              required
              value={form.english_expression}
              onChange={(event) => setForm((prev) => ({ ...prev, english_expression: event.target.value }))}
              placeholder="更自然、更专业的英文"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="mistake_note">错误 → 正确</Label>
              <Textarea
                id="mistake_note"
                value={form.mistake_note}
                onChange={(event) => setForm((prev) => ({ ...prev, mistake_note: event.target.value }))}
                placeholder="例：I need you send → Could you send"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tags">标签</Label>
              <Input
                id="tags"
                value={form.tags}
                onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))}
                placeholder="逗号分隔：报价, 展会"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button type="submit" disabled={!canSave || saving}>
              {mode === "create" ? <Plus className="h-4 w-4" /> : <Save className="h-4 w-4" />}
              {saving ? "保存中" : "保存"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
