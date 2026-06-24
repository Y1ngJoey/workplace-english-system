"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/auth-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isSupabaseConfigured } from "@/lib/supabase";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { loading, user } = useAuth();

  if (!isSupabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>需要配置 Supabase</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-6 text-ink-2">
            <p>请根据 `.env.example` 创建 `.env.local`，填入 Supabase URL 和 anon key。</p>
            <p>然后运行 `supabase/schema.sql` 和 `seed.sql`，再刷新页面。</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-ink-2">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        正在进入工作台
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>请先登录</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-6 text-slate">私人练习数据只在登录后可见。</p>
            <Link
              href="/"
              className="inline-flex min-h-10 items-center rounded-pill bg-pink px-5 text-sm font-bold text-white shadow-milk hover:bg-pink-deep"
            >
              去登录
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
