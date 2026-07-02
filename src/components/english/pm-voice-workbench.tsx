"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Flame,
  Headphones,
  Loader2,
  Mic2,
  RefreshCcw,
  Search,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toast-provider";
import { Button } from "@/components/ui/button";
import { addDays, todayKey, toDateKey } from "@/lib/dates";
import { pmScenes, pmVocabTerms, pmVocabulary, PM_TASK_TYPE, PM_WORD_SOURCE } from "@/lib/pm-roleplay";
import { supabase } from "@/lib/supabase";
import type { CorpusEntry, DailyLog } from "@/lib/types";
import { cn } from "@/lib/utils";

type WorkbenchView = "practice" | "wordbank";

type WorkbenchSession = {
  scene: number;
  turn: number;
  answers: Record<string, string>;
  turnsDone: number;
  answerShown: boolean;
};

type RecognitionResult = {
  0: {
    transcript: string;
  };
  isFinal: boolean;
};

type RecognitionEventLike = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: RecognitionResult;
  };
};

type RecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: RecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
};

type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: new () => RecognitionLike;
  webkitSpeechRecognition?: new () => RecognitionLike;
};

const defaultSession: WorkbenchSession = {
  scene: 0,
  turn: 0,
  answers: {},
  turnsDone: 0,
  answerShown: false,
};

const panelClass = "rounded-[26px] border border-[#eee4da]/90 bg-[rgba(255,253,247,.88)] shadow-[0_20px_55px_rgba(82,70,54,.09)]";
const softPanelClass = "rounded-[26px] border border-[#eee4da] bg-[rgba(255,255,255,.52)]";
const pillClass = "inline-flex min-h-9 items-center gap-2 rounded-full border border-[#eee4da] bg-white/70 px-3 text-xs font-black text-[#5c5868]";

function clampNumber(value: unknown, max: number) {
  const next = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return Math.min(Math.max(Math.trunc(next), 0), Math.max(max - 1, 0));
}

function answerKey(scene: number, turn: number) {
  return `${scene}:${turn}`;
}

function parseSession(notes: string | null): WorkbenchSession {
  if (!notes) return defaultSession;
  try {
    const raw = JSON.parse(notes) as Partial<WorkbenchSession>;
    const scene = clampNumber(raw.scene, pmScenes.length);
    const turn = clampNumber(raw.turn, pmScenes[scene]?.turns.length ?? 1);
    const answers =
      raw.answers && typeof raw.answers === "object" && !Array.isArray(raw.answers)
        ? Object.fromEntries(
            Object.entries(raw.answers).filter((entry): entry is [string, string] => typeof entry[1] === "string"),
          )
        : {};

    return {
      scene,
      turn,
      answers,
      turnsDone: typeof raw.turnsDone === "number" && Number.isFinite(raw.turnsDone) ? Math.max(0, raw.turnsDone) : 0,
      answerShown: Boolean(raw.answerShown),
    };
  } catch {
    return defaultSession;
  }
}

function splitSentences(text: string) {
  return (text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [text]).map((line) => line.trim()).filter(Boolean);
}

function normalizeTerm(term: string) {
  return term.trim().toLowerCase();
}

function isVocabTerm(term: string): term is keyof typeof pmVocabulary {
  return Object.prototype.hasOwnProperty.call(pmVocabulary, term);
}

function levelTone(level: string) {
  if (level === "基础") return "border-[#c8eadb] bg-[#edfbf5] text-[#217d60]";
  if (level === "进阶") return "border-[#f2d995] bg-[#fff4d5] text-[#986d13]";
  return "border-[#f1c4ce] bg-[#ffecef] text-[#b8475a]";
}

function speakEnglish(text: string, rate = 0.92) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = rate;
  utterance.pitch = 1;
  const voice =
    window.speechSynthesis.getVoices().find((item) => /en-US/i.test(item.lang)) ??
    window.speechSynthesis.getVoices().find((item) => /English/i.test(item.name));
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
  return true;
}

function computeStreak(dates: Set<string>) {
  let cursor = todayKey();
  let streak = 0;
  while (dates.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function PmVoiceWorkbench() {
  const { user } = useAuth();
  const { toast } = useToast();
  const chatRef = useRef<HTMLDivElement | null>(null);
  const today = useMemo(() => todayKey(), []);
  const [view, setView] = useState<WorkbenchView>("practice");
  const [session, setSession] = useState<WorkbenchSession>(defaultSession);
  const [wordEntries, setWordEntries] = useState<CorpusEntry[]>([]);
  const [completedDates, setCompletedDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  const [savingWord, setSavingWord] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const sceneIndex = clampNumber(session.scene, pmScenes.length);
  const currentScene = pmScenes[sceneIndex];
  const turnIndex = clampNumber(session.turn, currentScene.turns.length);
  const currentTurn = currentScene.turns[turnIndex];
  const currentKey = answerKey(sceneIndex, turnIndex);
  const currentAnswer = session.answers[currentKey] ?? "";
  const savedTerms = useMemo(() => new Set(wordEntries.map((entry) => normalizeTerm(entry.english_expression))), [wordEntries]);
  const wordByTerm = useMemo(() => new Map(wordEntries.map((entry) => [normalizeTerm(entry.english_expression), entry])), [wordEntries]);
  const streak = computeStreak(completedDates);
  const progress = Math.round(((turnIndex + 1) / currentScene.turns.length) * 100);

  const saveProgress = useCallback(
    async (nextSession: WorkbenchSession, nextCompletedDates = completedDates) => {
      if (!supabase || !user) return;
      const { error } = await supabase.from("daily_logs").upsert(
        {
          user_id: user.id,
          log_date: today,
          task_type: PM_TASK_TYPE,
          completed: nextCompletedDates.has(today),
          minutes_spent: Math.max(0, nextSession.turnsDone * 5),
          notes: JSON.stringify(nextSession),
        },
        { onConflict: "user_id,log_date,task_type" },
      );
      if (error) {
        toast({ title: "陪练进度保存失败", description: error.message, tone: "error" });
      }
    },
    [completedDates, today, toast, user],
  );

  const load = useCallback(async () => {
    if (!supabase || !user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [progressResult, checkinsResult, wordsResult] = await Promise.all([
      supabase
        .from("daily_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("log_date", today)
        .eq("task_type", PM_TASK_TYPE)
        .maybeSingle(),
      supabase
        .from("daily_logs")
        .select("log_date")
        .eq("user_id", user.id)
        .eq("task_type", PM_TASK_TYPE)
        .eq("completed", true)
        .order("log_date", { ascending: false })
        .limit(60),
      supabase
        .from("corpus_entries")
        .select("*")
        .eq("user_id", user.id)
        .eq("source", PM_WORD_SOURCE)
        .order("created_at", { ascending: true }),
    ]);

    if (progressResult.error || checkinsResult.error || wordsResult.error) {
      toast({
        title: "外贸英语数据读取失败",
        description: progressResult.error?.message || checkinsResult.error?.message || wordsResult.error?.message,
        tone: "error",
      });
    }

    const todayLog = (progressResult.data ?? null) as DailyLog | null;
    setSession(parseSession(todayLog?.notes ?? null));
    setCompletedDates(new Set((checkinsResult.data ?? []).map((item) => item.log_date)));
    setWordEntries((wordsResult.data ?? []) as CorpusEntry[]);
    setLoading(false);
  }, [today, toast, user]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [session, view]);

  function updateSession(nextSession: WorkbenchSession, shouldSave = true) {
    setSession(nextSession);
    if (shouldSave) void saveProgress(nextSession);
  }

  function selectScene(nextScene: number) {
    updateSession({ ...session, scene: nextScene, turn: 0, answerShown: false });
  }

  function updateAnswer(value: string, shouldSave = false) {
    const nextSession = {
      ...session,
      answers: {
        ...session.answers,
        [currentKey]: value,
      },
    };
    updateSession(nextSession, shouldSave);
  }

  function showAnswer() {
    updateSession({ ...session, answerShown: !session.answerShown });
  }

  function nextTurn() {
    const lastTurn = turnIndex >= currentScene.turns.length - 1;
    const lastScene = sceneIndex >= pmScenes.length - 1;
    const nextSession = {
      ...session,
      turnsDone: session.turnsDone + 1,
      answerShown: false,
      scene: lastTurn ? (lastScene ? 0 : sceneIndex + 1) : sceneIndex,
      turn: lastTurn ? 0 : turnIndex + 1,
    };
    updateSession(nextSession);
  }

  function resetPractice() {
    if (typeof window !== "undefined" && !window.confirm("重置今天的陪练进度？生词库不会删除。")) return;
    updateSession(defaultSession);
  }

  async function checkIn() {
    const nextDates = new Set(completedDates);
    nextDates.add(today);
    setCompletedDates(nextDates);
    await saveProgress(session, nextDates);
    toast({ title: "今日外贸英语已打卡", tone: "success" });
  }

  async function addWord(term: string) {
    const normalized = normalizeTerm(term);
    if (!isVocabTerm(normalized) || !supabase || !user || savedTerms.has(normalized)) return;
    setSavingWord(normalized);
    const info = pmVocabulary[normalized];
    const { data, error } = await supabase
      .from("corpus_entries")
      .insert({
        user_id: user.id,
        scenario: currentScene.title,
        chinese_intent: info.cn,
        english_expression: normalized,
        mistake_note: info.example,
        tags: ["PM", "roleplay"],
        source: PM_WORD_SOURCE,
        mastery: 0,
        next_review_at: new Date().toISOString(),
      })
      .select("*")
      .single();
    setSavingWord(null);
    if (error) {
      toast({ title: "加入生词库失败", description: error.message, tone: "error" });
      return;
    }
    if (data) setWordEntries((items) => [...items, data as CorpusEntry]);
    toast({ title: "已加入生词库", description: normalized, tone: "success" });
  }

  async function removeWord(term: string) {
    const entry = wordByTerm.get(normalizeTerm(term));
    if (!entry || !supabase) return;
    const { error } = await supabase.from("corpus_entries").delete().eq("id", entry.id);
    if (error) {
      toast({ title: "移除生词失败", description: error.message, tone: "error" });
      return;
    }
    setWordEntries((items) => items.filter((item) => item.id !== entry.id));
  }

  function playAudio(text: string, rate = 0.92) {
    if (!speakEnglish(text, rate)) {
      toast({ title: "当前浏览器不支持美音播放", description: "建议使用 Chrome、Edge 或 Safari。", tone: "info" });
    }
  }

  function startRecognition() {
    const Recognition = (window as unknown as SpeechRecognitionWindow).SpeechRecognition ?? (window as unknown as SpeechRecognitionWindow).webkitSpeechRecognition;
    if (!Recognition) {
      toast({ title: "当前浏览器不支持网页语音识别", description: "可以直接在输入框里手动写你的回答。", tone: "info" });
      return;
    }
    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    setRecording(true);
    let finalText = "";
    recognition.onresult = (event) => {
      let interim = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const text = event.results[index][0].transcript;
        if (event.results[index].isFinal) finalText += text;
        else interim += text;
      }
      updateAnswer((finalText || interim).trim(), false);
    };
    recognition.onerror = () => {
      setRecording(false);
      toast({ title: "语音识别中断", description: "你也可以直接手动输入回答。", tone: "info" });
    };
    recognition.onend = () => {
      setRecording(false);
      setSession((current) => {
        void saveProgress(current);
        return current;
      });
    };
    recognition.start();
  }

  function renderHighlighted(text: string) {
    const expression = new RegExp(`(${pmVocabTerms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
    return text.split(expression).map((part, index) => {
      const term = normalizeTerm(part);
      if (!isVocabTerm(term)) return <span key={`${part}-${index}`}>{part}</span>;
      const info = pmVocabulary[term];
      const saved = savedTerms.has(term);
      return (
        <button
          key={`${part}-${index}`}
          type="button"
          title={`${term} ${info.ipa}｜${info.cn}`}
          onClick={() => void addWord(term)}
          disabled={savingWord === term}
          className={cn(
            "mx-0.5 inline rounded-[7px] border px-1 leading-snug transition",
            saved ? "border-[#bde8d5] bg-[#eaf7f0] text-[#217d60]" : "border-[#f4d98d] bg-[#ffefc7] text-[#6e5622] hover:bg-[#ffe7ad]",
          )}
        >
          {part}
        </button>
      );
    });
  }

  function renderModelAnswer(text: string, turnKey: string) {
    return splitSentences(text).map((sentence, index) => (
      <span key={`${turnKey}-${index}`} className="mb-2 block last:mb-0">
        <span>{renderHighlighted(sentence)}</span>
        <button
          type="button"
          className="ml-2 inline-flex min-h-7 items-center gap-1 rounded-full border border-[#cddfff] bg-[#edf5ff] px-2 text-xs font-black text-[#3f6ee6]"
          onClick={() => playAudio(sentence)}
        >
          <Volume2 className="h-3.5 w-3.5" />
          美音
        </button>
      </span>
    ));
  }

  const previewWords = [...wordEntries].slice(-4).reverse();
  const filteredWords = wordEntries.filter((entry) => {
    const term = normalizeTerm(entry.english_expression);
    const info = isVocabTerm(term) ? pmVocabulary[term] : null;
    const haystack = `${entry.english_expression} ${entry.chinese_intent ?? ""} ${entry.mistake_note ?? ""} ${info?.ipa ?? ""} ${info?.example ?? ""}`.toLowerCase();
    return !search.trim() || haystack.includes(search.trim().toLowerCase());
  });
  const todayWordCount = wordEntries.filter((entry) => (entry.created_at ? toDateKey(new Date(entry.created_at)) === today : false)).length;
  const calendarDays = Array.from({ length: 21 }, (_, index) => {
    const date = addDays(today, index - 20);
    return { date, day: Number(date.slice(-2)), done: completedDates.has(date), isToday: date === today };
  });

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-[#625d6a]">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        正在读取外贸英语工作台
      </div>
    );
  }

  return (
    <div className="mx-auto grid min-h-[calc(100vh-52px)] max-w-[1420px] gap-4 p-3 sm:p-5 lg:p-[22px]">
      <header className="flex min-h-[74px] flex-col gap-3 rounded-[30px] border border-[#eee4da]/90 bg-[rgba(255,253,247,.72)] p-3 shadow-[0_10px_26px_rgba(82,70,54,.065)] backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[linear-gradient(135deg,#f6b9ca,#8db7ff_50%,#8bdcbd)] text-sm font-black text-white shadow-[0_12px_26px_rgba(141,183,255,.32)]">
            PM
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-black leading-tight tracking-tight text-[#252235]">Voice Roleplay</h1>
            <p className="mt-1 truncate text-xs font-bold text-[#807c8e]">敬城国际 PM 语音陪练 · Chat Demo</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full border border-[#eee4da] bg-white/70 p-1">
            <button
              type="button"
              className={cn(
                "rounded-full px-3 py-2 text-xs font-black transition",
                view === "practice" ? "bg-[linear-gradient(135deg,#fff,#eff6ff)] text-[#4f7df3] shadow-sm" : "text-[#716c7d]",
              )}
              onClick={() => setView("practice")}
            >
              语音陪练
            </button>
            <button
              type="button"
              className={cn(
                "rounded-full px-3 py-2 text-xs font-black transition",
                view === "wordbank" ? "bg-[linear-gradient(135deg,#fff,#eff6ff)] text-[#4f7df3] shadow-sm" : "text-[#716c7d]",
              )}
              onClick={() => setView("wordbank")}
            >
              生词库
            </button>
          </div>
          <span className={cn(pillClass, "border-[#c8eadb] bg-[#edfbf5] text-[#217d60]")}>
            <Headphones className="h-3.5 w-3.5" />
            美音
          </span>
          <span className={cn(pillClass, "border-[#f3d9b3] bg-[#fff2df] text-[#a96716]")}>
            <Flame className="h-3.5 w-3.5" />
            {streak} 天
          </span>
          <span className={cn(pillClass, "border-[#f3cfdb] bg-[#fff0f5] text-[#ba5472]")}>
            <BookOpen className="h-3.5 w-3.5" />
            生词 {wordEntries.length}
          </span>
          <Button type="button" variant="outline" size="sm" onClick={resetPractice}>
            <RefreshCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
        </div>
      </header>

      {view === "practice" ? (
        <main className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className={cn(panelClass, "p-4 xl:sticky xl:top-[76px]")}>
            <p className="mb-3 px-1 text-xs font-black uppercase tracking-[.16em] text-[#807c8e]">Roleplay Scenes</p>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              {pmScenes.map((scene, index) => (
                <button
                  key={scene.id}
                  type="button"
                  onClick={() => selectScene(index)}
                  className={cn(
                    "flex w-full gap-3 rounded-[20px] border p-3 text-left transition hover:-translate-y-0.5 hover:border-[#d7e5ff]",
                    index === sceneIndex
                      ? "border-[#cbdfff] bg-[linear-gradient(135deg,#fff6fb,#edf6ff_58%,#f2fff8)] shadow-[0_14px_28px_rgba(141,183,255,.16)]"
                      : "border-transparent bg-white/70",
                  )}
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[#edf5ff] text-xs font-black text-[#4f7df3]">
                    {scene.id}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-black leading-snug text-[#252235]">{scene.title.replace("Scene ", "")}</span>
                    <span className="mt-1 block text-xs font-bold text-[#807c8e]">{scene.stage}</span>
                    <span className="mt-2 flex flex-wrap gap-1.5">
                      <span className={cn("rounded-full border px-2 py-1 text-[11px] font-black", levelTone(scene.level))}>{scene.level}</span>
                      <span className="rounded-full border border-[#eee4da] bg-white/80 px-2 py-1 text-[11px] font-black text-[#6d687a]">
                        {scene.turns.length} 回合
                      </span>
                    </span>
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-4 rounded-[19px] border border-dashed border-[#e4d5cb] bg-white/70 p-3 text-sm font-semibold leading-relaxed text-[#625d6a]">
              <b className="mb-1 block text-[#252235]">当前结构</b>
              左侧选场景，中间聊天式练习，右侧只保留打卡和生词库。底部操作条放开麦、查看答案、下个回合。
            </div>
          </aside>

          <section className="grid gap-4 2xl:grid-cols-[minmax(0,1fr)_320px]">
            <section className={cn(panelClass, "min-w-0 p-4 sm:p-5")}>
              <div className="mb-4 flex flex-col gap-4 border-b border-[#eee4da] pb-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <h2 className="text-[22px] font-black leading-tight tracking-tight text-[#252235]">{currentScene.title}</h2>
                  <p className="mt-2 max-w-3xl text-sm font-semibold leading-relaxed text-[#807c8e]">{currentScene.objective}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-[#eee4da] bg-white/80 px-3 py-1.5 text-xs font-black text-[#6d687a]">{currentScene.stage}</span>
                    <span className="rounded-full border border-[#eee4da] bg-white/80 px-3 py-1.5 text-xs font-black text-[#6d687a]">{currentScene.roles}</span>
                    <span className={cn("rounded-full border px-3 py-1.5 text-xs font-black", levelTone(currentScene.level))}>{currentScene.level}</span>
                  </div>
                </div>
                <div className="w-full shrink-0 lg:w-[180px] lg:text-right">
                  <p className="mb-2 text-xs font-black text-[#807c8e]">
                    Turn {turnIndex + 1}/{currentScene.turns.length}
                  </p>
                  <div className="h-2.5 overflow-hidden rounded-full bg-[#f0e7dd]">
                    <div className="h-full rounded-full bg-[linear-gradient(90deg,#f6b9ca,#4f7df3,#8bdcbd)] transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              </div>

              <div className={cn(softPanelClass, "overflow-hidden")}>
                <div className="flex flex-col gap-1 border-b border-[#eee4da] bg-[linear-gradient(135deg,#fff8fb,#f0f7ff)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <strong className="text-sm text-[#252235]">{currentTurn.name}</strong>
                    <span className="ml-1 text-xs font-black text-[#807c8e]">｜{currentTurn.hint}</span>
                  </div>
                  <span className="text-xs font-black text-[#807c8e]">点击句尾听美音</span>
                </div>
                <div ref={chatRef} className="flex max-h-[620px] min-h-[480px] flex-col gap-4 overflow-auto p-4 scroll-smooth lg:min-h-[540px]">
                  {currentScene.turns.slice(0, turnIndex + 1).map((turn, index) => {
                    const isCurrent = index === turnIndex;
                    const key = answerKey(sceneIndex, index);
                    const answer = session.answers[key] ?? "";
                    const showCoach = index < turnIndex || (isCurrent && session.answerShown);
                    return (
                      <div key={`${currentScene.id}-${index}`} className="space-y-4">
                        <div className="flex items-end gap-2">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#74d6b4,#3ca985)] text-[11px] font-black text-white shadow-sm">
                            CU
                          </span>
                          <div className="max-w-[92%] rounded-[22px] rounded-tl-lg border border-[#eee4da] bg-white px-4 py-3 text-sm leading-relaxed shadow-[0_8px_20px_rgba(82,70,54,.045)] lg:max-w-[76%] lg:text-[15px]">
                            <div className="mb-2 flex items-center justify-between gap-3 text-xs font-black text-[#716c7d]">
                              <span>Customer</span>
                              <span>{isCurrent ? "当前回合" : "已完成"}</span>
                            </div>
                            <span>{turn.customer}</span>
                            <button
                              type="button"
                              className="ml-2 inline-flex min-h-7 items-center gap-1 rounded-full border border-[#cddfff] bg-[#edf5ff] px-2 text-xs font-black text-[#3f6ee6]"
                              onClick={() => playAudio(turn.customer)}
                            >
                              <Volume2 className="h-3.5 w-3.5" />
                              美音
                            </button>
                          </div>
                        </div>

                        <div className="flex items-end justify-end gap-2">
                          <div className="max-w-[92%] rounded-[22px] rounded-tr-lg border border-[#cddfff] bg-[linear-gradient(135deg,#f7fbff,#eef6ff)] px-4 py-3 text-sm leading-relaxed shadow-[0_8px_20px_rgba(82,70,54,.045)] lg:max-w-[76%] lg:text-[15px]">
                            <div className="mb-2 flex items-center justify-between gap-3 text-xs font-black text-[#716c7d]">
                              <span>My PM answer</span>
                              {isCurrent && recording ? (
                                <span className="inline-flex items-center gap-1.5 text-[#217d60]">
                                  <span className="h-2 w-2 animate-ping rounded-full bg-[#2fa47b]" />
                                  listening
                                </span>
                              ) : null}
                            </div>
                            {answer ? <span>{answer}</span> : <span className="text-[#807c8e]">点击底部开麦，或直接写下你的回答。</span>}
                          </div>
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#83aeff,#6e7cf4)] text-[11px] font-black text-white shadow-sm">
                            ME
                          </span>
                        </div>

                        {showCoach ? (
                          <div className="flex items-end justify-end gap-2">
                            <div className="max-w-[92%] rounded-[22px] rounded-tr-lg border border-[#efd0df] bg-[linear-gradient(135deg,#fff4f8,#f6f1ff)] px-4 py-3 text-sm leading-relaxed shadow-[0_8px_20px_rgba(82,70,54,.045)] lg:max-w-[76%] lg:text-[15px]">
                              <div className="mb-2 flex flex-col gap-1 text-xs font-black text-[#716c7d] sm:flex-row sm:items-center sm:justify-between">
                                <span>参考 PM 回答</span>
                                <span>点击高亮词加入生词库</span>
                              </div>
                              {renderModelAnswer(turn.model, key)}
                            </div>
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#f6b9ca,#c9b8ff)] text-[11px] font-black text-white shadow-sm">
                              PM
                            </span>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
                <div className="flex flex-col gap-3 border-t border-[#eee4da] bg-[linear-gradient(135deg,rgba(255,250,241,.86),rgba(240,247,255,.86))] p-3 lg:flex-row lg:items-end">
                  <textarea
                    value={currentAnswer}
                    onChange={(event) => updateAnswer(event.target.value, false)}
                    onBlur={() => void saveProgress(session)}
                    placeholder="点击开麦回答，或直接手动输入你的 PM 回复。"
                    className="min-h-[44px] flex-1 resize-none rounded-2xl border border-[#eee4da] bg-white/70 px-3 py-3 text-sm font-semibold text-[#625d6a] outline-none transition focus:border-[#cddfff] focus:ring-4 focus:ring-[#8db7ff]/20"
                  />
                  <div className="flex flex-wrap gap-2 lg:justify-end">
                    <Button type="button" variant="softBlue" className="flex-1 lg:flex-none" onClick={startRecognition} disabled={recording}>
                      <Mic2 className="h-4 w-4" />
                      {recording ? "正在听..." : "开麦回答"}
                    </Button>
                    <Button type="button" variant="softPink" className="flex-1 lg:flex-none" onClick={showAnswer}>
                      <Sparkles className="h-4 w-4" />
                      {session.answerShown ? "隐藏答案" : "查看答案"}
                    </Button>
                    <Button type="button" variant="blue" className="flex-1 lg:flex-none" onClick={nextTurn}>
                      下个回合
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </section>

            <aside className="grid gap-4">
              <section className={cn(panelClass, "p-4")}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-black text-[#252235]">Daily Check-in 打卡</h3>
                    <p className="mt-1 text-xs font-semibold leading-relaxed text-[#807c8e]">完成今天 1 个回合即可打卡</p>
                  </div>
                  <Button type="button" variant="softBlue" onClick={checkIn} disabled={completedDates.has(today)}>
                    <CheckCircle2 className="h-4 w-4" />
                    {completedDates.has(today) ? "已打卡" : "打卡"}
                  </Button>
                </div>
                <div className="mt-4 grid grid-cols-7 gap-1.5">
                  {calendarDays.map((day) => (
                    <div
                      key={day.date}
                      className={cn(
                        "grid h-7 place-items-center rounded-[11px] border text-[11px] font-bold",
                        day.done ? "border-[#c8eadb] bg-[#edfbf5] text-[#217d60]" : "border-[#eee4da] bg-white/70 text-[#807c8e]",
                        day.isToday && "outline outline-2 outline-[#8db7ff]/70",
                      )}
                    >
                      {day.done ? <Check className="h-3.5 w-3.5" /> : day.day}
                    </div>
                  ))}
                </div>
              </section>

              <section className={cn(panelClass, "p-4")}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-black text-[#252235]">My Word Bank 生词库</h3>
                    <p className="mt-1 text-xs font-semibold leading-relaxed text-[#807c8e]">点击标准答案高亮词自动加入</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => setView("wordbank")}>
                    进入
                  </Button>
                </div>
                <div className="my-4 grid grid-cols-3 gap-2">
                  <div className="rounded-2xl border border-[#eee4da] bg-white/70 p-3">
                    <b className="block text-xl font-black text-[#252235]">{wordEntries.length}</b>
                    <span className="text-[11px] font-bold text-[#807c8e]">生词</span>
                  </div>
                  <div className="rounded-2xl border border-[#eee4da] bg-white/70 p-3">
                    <b className="block text-xl font-black text-[#252235]">{session.turnsDone}</b>
                    <span className="text-[11px] font-bold text-[#807c8e]">回合</span>
                  </div>
                  <div className="rounded-2xl border border-[#eee4da] bg-white/70 p-3">
                    <b className="block text-xl font-black text-[#252235]">{pmScenes.length}</b>
                    <span className="text-[11px] font-bold text-[#807c8e]">场景</span>
                  </div>
                </div>
                <div className="grid gap-2">
                  {previewWords.length ? (
                    previewWords.map((entry) => {
                      const term = normalizeTerm(entry.english_expression);
                      const info = isVocabTerm(term) ? pmVocabulary[term] : null;
                      return (
                        <div key={entry.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-[#eee4da] py-2 last:border-b-0">
                          <div className="min-w-0">
                            <b className="block truncate text-sm font-black text-[#252235]">{entry.english_expression}</b>
                            <small className="mt-1 block truncate text-[11px] font-semibold text-[#807c8e]">
                              {info ? `${info.ipa} · ${info.cn}` : entry.chinese_intent}
                            </small>
                          </div>
                          <button
                            type="button"
                            className="grid h-8 w-8 place-items-center rounded-xl border border-[#e5d9cf] bg-white text-[#4f7df3]"
                            onClick={() => playAudio(entry.english_expression, 0.86)}
                            aria-label="播放美音"
                          >
                            <Volume2 className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="rounded-[18px] border border-dashed border-[#e5d9cf] bg-white/70 p-5 text-center text-sm font-semibold text-[#807c8e]">
                      暂无生词。查看答案后点击高亮词即可加入。
                    </div>
                  )}
                </div>
              </section>
            </aside>
          </section>
        </main>
      ) : (
        <main className={cn(panelClass, "p-4 sm:p-5")}>
          <div className="mb-4 flex flex-col gap-4 border-b border-[#eee4da] pb-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-[#252235]">My Word Bank 生词库</h2>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-relaxed text-[#807c8e]">
                从语音陪练的标准答案中点击高亮词沉淀到这里。每个词保留音标、中文释义、例句和美音播放。
              </p>
            </div>
            <label className="relative w-full lg:w-[380px]">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#807c8e]" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="搜索单词 / 中文 / 例句"
                className="h-11 w-full rounded-full border border-[#e5d9cf] bg-white/75 pl-10 pr-4 text-sm font-semibold outline-none transition focus:border-[#cddfff] focus:ring-4 focus:ring-[#8db7ff]/20"
              />
            </label>
          </div>
          <div className="mb-4 grid max-w-xl gap-2 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#eee4da] bg-white/70 p-3">
              <b className="block text-2xl font-black text-[#252235]">{wordEntries.length}</b>
              <span className="text-[11px] font-bold text-[#807c8e]">总生词</span>
            </div>
            <div className="rounded-2xl border border-[#eee4da] bg-white/70 p-3">
              <b className="block text-2xl font-black text-[#252235]">{todayWordCount}</b>
              <span className="text-[11px] font-bold text-[#807c8e]">今日新增</span>
            </div>
            <div className="rounded-2xl border border-[#eee4da] bg-white/70 p-3">
              <b className="block text-2xl font-black text-[#252235]">{wordEntries.length}</b>
              <span className="text-[11px] font-bold text-[#807c8e]">待复习</span>
            </div>
          </div>
          {filteredWords.length ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredWords.map((entry) => {
                const term = normalizeTerm(entry.english_expression);
                const info = isVocabTerm(term) ? pmVocabulary[term] : null;
                return (
                  <article key={entry.id} className="grid gap-3 rounded-[20px] border border-[#eee4da] bg-white/70 p-4">
                    <div>
                      <h3 className="text-lg font-black text-[#252235]">{entry.english_expression}</h3>
                      <p className="mt-1 text-sm font-black text-[#4f7df3]">{info?.ipa ?? ""}</p>
                    </div>
                    <p className="text-sm font-semibold text-[#5d586a]">{info?.cn ?? entry.chinese_intent ?? "待补充"}</p>
                    <p className="rounded-2xl border border-[#eee4da] bg-[#fff8ee] p-3 text-xs font-semibold leading-relaxed text-[#807c8e]">
                      {info?.example ?? entry.mistake_note ?? "暂无例句"}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="softBlue" size="sm" onClick={() => playAudio(entry.english_expression, 0.86)}>
                        <Volume2 className="h-3.5 w-3.5" />
                        美音
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => void removeWord(entry.english_expression)}>
                        <X className="h-3.5 w-3.5" />
                        移除
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[18px] border border-dashed border-[#e5d9cf] bg-white/70 p-6 text-center text-sm font-semibold text-[#807c8e]">
              暂无匹配生词。回到语音陪练，点击标准答案中的高亮词即可加入。
            </div>
          )}
        </main>
      )}
    </div>
  );
}
