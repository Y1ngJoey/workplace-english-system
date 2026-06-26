"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LockKeyhole } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toast-provider";
import { Button } from "@/components/ui/button";
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
    <main className="min-h-screen bg-[linear-gradient(135deg,#FCE9F0_0%,#FBFAF7_46%,#EAF1FA_100%)] px-5 py-12 text-ink sm:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-6rem)] w-full max-w-5xl items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
        <section className="space-y-5">
          <span className="inline-flex rounded-pill bg-pink-soft px-4 py-1.5 text-xs font-extrabold tracking-[0.02em] text-pink-deep">
            ♡ private space
          </span>
          <h1 className="font-display text-[clamp(2.4rem,6.5vw,4rem)] font-extrabold leading-[1.04] text-ink">
            Hi, I&apos;m Joey
          </h1>
          <p className="max-w-sm text-base leading-8 text-ink-2">
            一个装下我所有热爱的地方。ε٩(๑&gt; ₃ &lt;)۶з
          </p>
          <p className="inline-flex text-sm font-extrabold tracking-[0.04em] text-slate">English · Jazz · the world</p>
        </section>

        <section className="rounded-[26px] border border-line/90 bg-white px-7 py-8 shadow-[0_16px_44px_rgba(150,140,150,0.16)] sm:px-8">
          <div className="mb-7">
            <div className="mb-4 grid h-12 w-12 place-items-center rounded-full bg-pink-soft text-pink-deep">
              <LockKeyhole className="h-5 w-5" />
            </div>
            <h2 className="font-display text-2xl font-extrabold text-ink">欢迎回来 ✶</h2>
            <p className="mt-1 text-sm font-semibold text-slate">好久不见呀～</p>
          </div>

          {!isSupabaseConfigured ? (
            <div className="rounded-[18px] border border-blue-line bg-blue-soft p-4 text-sm leading-6 text-blue-deep">
              先创建 `.env.local` 并填入 Supabase URL / anon key，再刷新页面。
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-extrabold text-ink-2">
                  邮箱
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  className="h-12 rounded-[13px] border-[1.5px] bg-[#FFFCFE] text-ink shadow-none focus:border-pink-line focus:bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-xs font-extrabold text-ink-2">
                  密码
                </Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  minLength={6}
                  className="h-12 rounded-[13px] border-[1.5px] bg-[#FFFCFE] text-ink shadow-none focus:border-pink-line focus:bg-white"
                />
              </div>

              <Button
                className="mt-1 w-full rounded-pill bg-pink py-3 text-base text-white shadow-[0_4px_14px_rgba(240,164,192,0.45)] hover:bg-pink-deep"
                type="submit"
                disabled={submitting}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                → 进来
              </Button>

              <button
                type="button"
                className="w-full rounded-pill px-4 py-2 text-sm font-extrabold text-blue-deep transition hover:bg-blue-soft"
                onClick={() => setMode((current) => (current === "sign-in" ? "sign-up" : "sign-in"))}
              >
                {mode === "sign-in" ? "第一次来？建个账号 (｡･ω･｡)" : "已有账号？回来登录 ♡"}
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
