"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, Edit3, FilePlus2, Loader2, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { CorpusEntryDialog, DEFAULT_SCENARIOS } from "@/components/corpus-entry-dialog";
import { useCorpusDialog } from "@/components/corpus-dialog-context";
import { PageHeading } from "@/components/page-heading";
import { useToast } from "@/components/toast-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DETAILS_CORPUS_ENTRIES, DETAILS_CORPUS_SOURCE } from "@/lib/details-corpus";
import { supabase } from "@/lib/supabase";
import type { CorpusEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

const masteryLabels = ["未掌握", "模糊", "熟练"];

export default function CorpusPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { openCreateDialog } = useCorpusDialog();
  const [entries, setEntries] = useState<CorpusEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [scenario, setScenario] = useState("全部");
  const [editingEntry, setEditingEntry] = useState<CorpusEntry | null>(null);
  const [importingDetails, setImportingDetails] = useState(false);

  const load = useCallback(async () => {
    if (!supabase || !user) {
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("corpus_entries")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "语料库读取失败", description: error.message, tone: "error" });
    } else {
      setEntries((data ?? []) as CorpusEntry[]);
    }
    setLoading(false);
  }, [toast, user]);

  useEffect(() => {
    void load();
    window.addEventListener("corpus:changed", load);
    return () => window.removeEventListener("corpus:changed", load);
  }, [load]);

  const filteredEntries = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return entries.filter((entry) => {
      const scenarioMatch = scenario === "全部" || entry.scenario === scenario;
      const text = [
        entry.scenario,
        entry.chinese_intent,
        entry.english_expression,
        entry.mistake_note,
        entry.tags?.join(" "),
        entry.source,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return scenarioMatch && (!needle || text.includes(needle));
    });
  }, [entries, query, scenario]);

  const scenarioFilters = useMemo(() => {
    const savedScenarios = Array.from(
      new Set(entries.map((entry) => entry.scenario.trim()).filter(Boolean)),
    );
    const filters = savedScenarios.length > 0 ? savedScenarios : DEFAULT_SCENARIOS;
    return ["全部", ...filters];
  }, [entries]);

  async function deleteEntry(entry: CorpusEntry) {
    if (!supabase || !confirm("删除这条语料？")) {
      return;
    }
    const { error } = await supabase.from("corpus_entries").delete().eq("id", entry.id);
    if (error) {
      toast({ title: "删除失败", description: error.message, tone: "error" });
      return;
    }
    toast({ title: "语料已删除", tone: "success" });
    await load();
  }

  async function updateMastery(entry: CorpusEntry, mastery: number) {
    if (!supabase) {
      return;
    }
    const { error } = await supabase.from("corpus_entries").update({ mastery }).eq("id", entry.id);
    if (error) {
      toast({ title: "掌握度保存失败", description: error.message, tone: "error" });
      return;
    }
    await load();
  }

  async function markReviewed(entry: CorpusEntry) {
    if (!supabase) {
      return;
    }
    const intervalDays = entry.mastery === 2 ? 7 : entry.mastery === 1 ? 3 : 1;
    const next = new Date();
    next.setDate(next.getDate() + intervalDays);
    const { error } = await supabase
      .from("corpus_entries")
      .update({
        last_reviewed_at: new Date().toISOString(),
        next_review_at: next.toISOString(),
      })
      .eq("id", entry.id);

    if (error) {
      toast({ title: "复习记录失败", description: error.message, tone: "error" });
      return;
    }
    toast({ title: "已更新下次复习时间", description: `${intervalDays} 天后再看。`, tone: "success" });
    await load();
  }

  async function convertToIdea(entry: CorpusEntry) {
    if (!supabase || !user) {
      return;
    }
    const { error } = await supabase.from("idea_bank").insert({
      user_id: user.id,
      idea: entry.chinese_intent || entry.english_expression,
      source: `语料·${entry.scenario}`,
      status: "idea",
      linked_corpus_id: entry.id,
    });
    if (error) {
      toast({ title: "转选题失败", description: error.message, tone: "error" });
      return;
    }
    toast({ title: "已转为选题", description: "数据已写入 idea_bank，Phase 2 选题灵感页会读取它。", tone: "success" });
  }

  async function importDetailsCorpus() {
    if (!supabase || !user) {
      return;
    }

    setImportingDetails(true);
    const { data: existingRows, error: existingError } = await supabase
      .from("corpus_entries")
      .select("english_expression")
      .eq("user_id", user.id)
      .eq("source", DETAILS_CORPUS_SOURCE);

    if (existingError) {
      setImportingDetails(false);
      toast({ title: "读取已导入句型失败", description: existingError.message, tone: "error" });
      return;
    }

    const existingExpressions = new Set((existingRows ?? []).map((row) => row.english_expression));
    const rowsToInsert = DETAILS_CORPUS_ENTRIES.filter(
      (entry) => !existingExpressions.has(entry.english_expression),
    ).map((entry) => ({
      user_id: user.id,
      scenario: entry.scenario,
      chinese_intent: entry.chinese_intent,
      english_expression: entry.english_expression,
      mistake_note: entry.mistake_note ?? null,
      tags: entry.tags,
      source: DETAILS_CORPUS_SOURCE,
      mastery: 0,
    }));

    if (rowsToInsert.length === 0) {
      setImportingDetails(false);
      toast({ title: "已经导入过啦", description: "PDF Details 模板句型没有新增项。", tone: "info" });
      return;
    }

    const { error } = await supabase.from("corpus_entries").insert(rowsToInsert);
    setImportingDetails(false);

    if (error) {
      toast({ title: "导入失败", description: error.message, tone: "error" });
      return;
    }

    toast({
      title: "模板句型已进语料库",
      description: `新增 ${rowsToInsert.length} 条 PDF Details 句型。`,
      tone: "success",
    });
    await load();
  }

  return (
    <div>
      <PageHeading
        title="语料库"
        description="把真实工作里的表达沉淀下来，按场景和掌握度慢慢磨熟。"
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="softBlue" onClick={importDetailsCorpus} disabled={importingDetails}>
              {importingDetails ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePlus2 className="h-4 w-4" />}
              导入Details句型
            </Button>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4" />
              新增语料
            </Button>
          </div>
        }
      />

      <Card className="mb-5">
        <CardContent className="space-y-4 p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="pl-10"
              placeholder="搜索中文、英文、错误、标签"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {scenarioFilters.map((item) => (
              <button
                key={item}
                className={cn(
                  "shrink-0 rounded-pill border px-4 py-2 text-sm font-bold transition",
                  scenario === item
                    ? "border-pink-line bg-pink-soft text-pink-deep"
                    : "border-line bg-white text-ink-2 hover:bg-line-2",
                )}
                onClick={() => setScenario(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex min-h-60 items-center justify-center text-ink-2">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          正在读取语料
        </div>
      ) : filteredEntries.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="font-display text-2xl font-extrabold text-ink">还没有匹配的语料</p>
            <p className="mt-2 text-sm text-slate">从真实邮件、会议或展会里摘一句开始。</p>
            <Button className="mt-5" onClick={openCreateDialog}>
              <Plus className="h-4 w-4" />
              新增语料
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredEntries.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <Badge tone="pink">{entry.scenario}</Badge>
                      {entry.source ? <Badge>{entry.source}</Badge> : null}
                      <Badge tone={entry.mastery === 2 ? "blue" : entry.mastery === 1 ? "amber" : "neutral"}>
                        {masteryLabels[entry.mastery ?? 0]}
                      </Badge>
                    </div>
                    {entry.chinese_intent ? <p className="mb-2 text-sm leading-6 text-slate">{entry.chinese_intent}</p> : null}
                    <p className="text-lg font-extrabold leading-8 text-ink">{entry.english_expression}</p>
                    {entry.mistake_note ? (
                      <div className="mt-3 rounded-2xl border border-[#F3D5A0] bg-[#FFF7E7] p-3 text-sm leading-6 text-[#8C6417]">
                        ✕ → ✓ {entry.mistake_note}
                      </div>
                    ) : null}
                    {entry.tags?.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {entry.tags.map((tag) => (
                          <span key={tag} className="text-xs font-bold text-slate">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2 lg:max-w-xs lg:justify-end">
                    {[0, 1, 2].map((level) => (
                      <Button
                        key={level}
                        variant={entry.mastery === level ? "softPink" : "ghost"}
                        size="sm"
                        onClick={() => updateMastery(entry, level)}
                      >
                        {entry.mastery === level ? <Check className="h-3.5 w-3.5" /> : null}
                        {masteryLabels[level]}
                      </Button>
                    ))}
                    <Button variant="softBlue" size="sm" onClick={() => markReviewed(entry)}>
                      <RefreshCw className="h-3.5 w-3.5" />
                      复习
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="编辑语料" onClick={() => setEditingEntry(entry)}>
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button variant="danger" size="icon" aria-label="删除语料" onClick={() => deleteEntry(entry)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-4 flex justify-end">
                  <button
                    className="inline-flex items-center gap-2 rounded-pill border border-dashed border-blue px-4 py-2 text-sm font-extrabold text-blue-deep hover:bg-blue-soft"
                    onClick={() => convertToIdea(entry)}
                  >
                    转为选题 <ArrowRight className="h-4 w-4" /> 对外
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CorpusEntryDialog
        entry={editingEntry}
        open={Boolean(editingEntry)}
        onOpenChange={(open) => {
          if (!open) setEditingEntry(null);
        }}
        onSaved={load}
        scenarioOptions={scenarioFilters.filter((item) => item !== "全部")}
      />
    </div>
  );
}
