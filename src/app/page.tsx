"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, LockKeyhole } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toast-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/app/today");
    }
  }, [loading, router, user]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) {
      return;
    }
    setSubmitting(true);
    const action =
      mode === "sign-in"
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password });
    const { error } = await action;
    setSubmitting(false);

    if (error) {
      toast({ title: "登录失败", description: error.message, tone: "error" });
      return;
    }

    toast({
      title: mode === "sign-in" ? "欢迎回来" : "账号已创建",
      description: "正在进入你的私人工作台。",
      tone: "success",
    });
    router.replace("/app/today");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <section className="space-y-5">
          <div className="inline-flex rounded-pill border border-pink-line bg-white px-4 py-2 text-sm font-bold text-pink-deep shadow-sm">
            Phase 1 · 对内练习
          </div>
          <div>
            <h1 className="font-display text-5xl font-extrabold leading-[1.05] text-ink sm:text-6xl">
              外贸英语 ♡ 工作台
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-ink-2">
              今日打卡、语料库、每周复盘、语音陪练和成长记录集中在一个私密空间里，数据通过 Supabase 持久化保存。
            </p>
          </div>
          <div className="grid max-w-xl gap-3 sm:grid-cols-3">
            {["奶粉练习", "奶蓝进度", "可编辑复盘"].map((item) => (
              <div key={item} className="rounded-[18px] border border-line bg-card px-4 py-3 text-sm font-bold text-ink-2 shadow-milk">
                {item}
              </div>
            ))}
          </div>
        </section>

        <Card className="rounded-[22px]">
          <CardContent className="p-6 sm:p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-pill bg-pink-soft text-pink-deep">
                <LockKeyhole className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-2xl font-extrabold text-ink">登录私人工作台</h2>
                <p className="text-sm text-slate">邮箱 + 密码，单账号使用即可。</p>
              </div>
            </div>

            {!isSupabaseConfigured ? (
              <div className="rounded-[18px] border border-blue-line bg-blue-soft p-4 text-sm leading-6 text-blue-deep">
                先创建 `.env.local` 并填入 Supabase URL / anon key，再刷新页面。
              </div>
            ) : (
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="email">邮箱</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">密码</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    minLength={6}
                  />
                </div>

                <Button className="w-full" type="submit" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  {mode === "sign-in" ? "登录" : "创建账号"}
                </Button>

                <button
                  type="button"
                  className="w-full rounded-pill px-4 py-2 text-sm font-bold text-blue-deep hover:bg-blue-soft"
                  onClick={() => setMode((current) => (current === "sign-in" ? "sign-up" : "sign-in"))}
                >
                  {mode === "sign-in" ? "第一次使用？创建账号" : "已有账号？返回登录"}
                </button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
