"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, Loader2, MapPin, Plus, Sparkles } from "lucide-react";
import { TravelGlobe } from "@/components/travel/travel-globe";
import { useAuth } from "@/components/auth-provider";
import { useToast } from "@/components/toast-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import type { TravelPlace, TravelPlaceMedia, TravelTrip } from "@/lib/types";
import {
  formatTripRange,
  getTripYear,
  sortTravelPlaces,
  sortTravelTrips,
  travelTypeMeta,
  type TravelPlaceWithMedia,
  type TravelTripWithPlaces,
} from "@/lib/travel";
import { cn } from "@/lib/utils";

type Filter = {
  year: string;
  country: string;
};

const emptyTripForm = {
  title: "",
  country: "",
  country_flag: "",
  date_start: "",
  date_end: "",
  intro: "",
  cover_emoji: "✈️",
};

function groupTrips(trips: TravelTrip[], places: TravelPlace[], media: TravelPlaceMedia[]) {
  const mediaByPlace = new Map<string, TravelPlaceMedia[]>();
  for (const item of media) {
    const list = mediaByPlace.get(item.place_id) ?? [];
    list.push(item);
    mediaByPlace.set(item.place_id, list);
  }

  const placesByTrip = new Map<string, TravelPlaceWithMedia[]>();
  for (const place of places) {
    const list = placesByTrip.get(place.trip_id) ?? [];
    list.push({
      ...place,
      media: (mediaByPlace.get(place.id) ?? []).sort((a, b) => a.sort_order - b.sort_order),
    });
    placesByTrip.set(place.trip_id, list);
  }

  return sortTravelTrips(
    trips.map((trip) => ({
      ...trip,
      places: sortTravelPlaces(placesByTrip.get(trip.id) ?? []),
    })),
  );
}

function getErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return error instanceof Error ? error.message : "请稍后再试一次。";
}

function FilterChip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex min-h-10 shrink-0 items-center rounded-pill border px-4 text-sm font-extrabold transition",
        active ? "border-mint-line bg-mint-soft text-mint-deep" : "border-line bg-white text-ink-2 hover:bg-mint-soft",
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function FootprintTile({ trip }: { trip: TravelTripWithPlaces }) {
  const colors = trip.places.map((place) => travelTypeMeta[place.type_color]?.color ?? "#5C9F80").slice(0, 5);
  const points = [
    { x: 32, y: 62 },
    { x: 82, y: 94 },
    { x: 112, y: 128 },
    { x: 56, y: 162 },
    { x: 132, y: 178 },
  ];

  return (
    <div className="min-w-[160px]">
      <div className="relative aspect-[3/4] overflow-hidden rounded-[22px] border border-mint-line bg-gradient-to-br from-mint-soft via-white to-blue-soft">
        <span className="absolute left-4 top-4 rounded-pill bg-white/85 px-3 py-1 text-xs font-extrabold text-mint-deep">
          🐾 足迹
        </span>
        <svg className="absolute inset-x-4 bottom-4 top-10 h-[calc(100%-3.5rem)] w-[calc(100%-2rem)]" viewBox="0 0 156 208" aria-hidden="true">
          <path d="M 32,62 C 64,65 56,112 82,94 C 114,72 92,142 112,128 C 136,114 92,178 132,178" fill="none" stroke="#5C9F80" strokeWidth="1.6" strokeDasharray="2 8" strokeLinecap="round" />
          {points.slice(0, Math.max(1, Math.min(points.length, trip.places.length))).map((point, index) => (
            <g key={index}>
              <circle cx={point.x} cy={point.y} r="9" fill="#fff" stroke={colors[index] ?? "#5C9F80"} strokeWidth="1.4" />
              <text x={point.x} y={point.y + 3.5} textAnchor="middle" fontFamily="Nunito" fontSize="10" fontWeight="800" fill={colors[index] ?? "#5C9F80"}>
                {index + 1}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div className="mt-3 flex items-center gap-2 text-sm font-extrabold text-ink">
        <span className="h-4 w-1.5 rounded-full bg-mint" />
        足迹地图
      </div>
    </div>
  );
}

function CategoryTile({
  type,
  places,
}: {
  type: keyof typeof travelTypeMeta;
  places: TravelPlaceWithMedia[];
}) {
  const meta = travelTypeMeta[type];
  const count = places.reduce((total, place) => total + place.media.filter((item) => item.kind === "photo").length, 0);
  return (
    <div className="min-w-[160px]">
      <div
        className={cn(
          "relative grid aspect-[3/4] place-items-center overflow-hidden rounded-[22px] border text-center shadow-sm",
          meta.softClassName,
        )}
      >
        <span className="text-5xl">{meta.icon}</span>
        <span className="absolute right-3 top-3 rounded-pill bg-white/86 px-3 py-1 text-xs font-extrabold">
          {count || places.length} 条
        </span>
      </div>
      <div className="mt-3 flex items-center gap-2 text-sm font-extrabold text-ink">
        <span className={cn("h-4 w-1.5 rounded-full", meta.barClassName)} />
        {meta.label}
      </div>
    </div>
  );
}

function TripRail({ trip }: { trip: TravelTripWithPlaces }) {
  const byType = {
    stay: trip.places.filter((place) => place.type_color === "stay"),
    food: trip.places.filter((place) => place.type_color === "food"),
    see: trip.places.filter((place) => place.type_color === "see"),
    shop: trip.places.filter((place) => place.type_color === "shop"),
  };
  const visibleTypes = (Object.keys(byType) as Array<keyof typeof byType>).filter((type) => byType[type].length > 0);

  return (
    <Card className="overflow-hidden rounded-[26px] border-line bg-white/88">
      <CardContent className="p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-display text-2xl font-extrabold text-ink">{trip.title}</h2>
            <div className="mt-2 flex flex-wrap gap-2 text-xs font-extrabold text-slate">
              <span className="rounded-pill bg-line-2 px-3 py-1">{formatTripRange(trip)}</span>
              <span className="rounded-pill bg-mint-soft px-3 py-1 text-mint-deep">
                {trip.country_flag ? `${trip.country_flag} ` : ""}
                {trip.country ?? "国家未定"}
              </span>
            </div>
          </div>
          <Button variant="softBlue" asChild>
            <Link href={`/app/travel/${trip.id}`}>
              进入旅行详情
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        {trip.intro ? <p className="mb-5 text-sm font-semibold leading-7 text-ink-2">{trip.intro}</p> : null}

        <div className="flex gap-4 overflow-x-auto pb-2">
          <FootprintTile trip={trip} />
          {visibleTypes.map((type) => (
            <CategoryTile key={type} type={type} places={byType[type]} />
          ))}
          {visibleTypes.length === 0 ? (
            <div className="grid min-w-[160px] place-items-center rounded-[22px] border border-dashed border-line bg-line-2/50 p-5 text-center text-sm font-bold text-slate">
              进入详情后加地点
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function TravelOverviewPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [trips, setTrips] = useState<TravelTripWithPlaces[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>({ year: "all", country: "all" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyTripForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!supabase || !user) return;
    setLoading(true);
    const [tripsResult, placesResult, mediaResult] = await Promise.all([
      supabase.from("trips").select("*").eq("user_id", user.id).order("sort_order", { ascending: true }).order("date_start", { ascending: false }),
      supabase.from("places").select("*").eq("user_id", user.id).order("sort_order", { ascending: true }),
      supabase.from("place_media").select("*").eq("user_id", user.id).order("sort_order", { ascending: true }),
    ]);

    const error = tripsResult.error || placesResult.error || mediaResult.error;
    if (error) {
      toast({
        title: "旅行数据读取失败",
        description: `${error.message}。如果是第一次使用，请先运行 supabase/travel-expansion.sql。`,
        tone: "error",
      });
    } else {
      setTrips(groupTrips((tripsResult.data ?? []) as TravelTrip[], (placesResult.data ?? []) as TravelPlace[], (mediaResult.data ?? []) as TravelPlaceMedia[]));
    }
    setLoading(false);
  }, [toast, user]);

  useEffect(() => {
    void load();
  }, [load]);

  const years = useMemo(() => Array.from(new Set(trips.map(getTripYear))).filter(Boolean), [trips]);
  const countries = useMemo(
    () => Array.from(new Set(trips.map((trip) => trip.country).filter((value): value is string => Boolean(value)))),
    [trips],
  );
  const filteredTrips = useMemo(
    () =>
      trips.filter((trip) => {
        const yearOk = filter.year === "all" || getTripYear(trip) === filter.year;
        const countryOk = filter.country === "all" || trip.country === filter.country;
        return yearOk && countryOk;
      }),
    [filter, trips],
  );
  const stats = useMemo(() => {
    const countryCount = new Set(trips.map((trip) => trip.country).filter(Boolean)).size;
    const placeCount = trips.reduce((sum, trip) => sum + trip.places.length, 0);
    return [
      { label: "国家", value: countryCount },
      { label: "旅程", value: trips.length },
      { label: "地点", value: placeCount },
    ];
  }, [trips]);

  async function saveTrip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !user) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("trips")
        .insert({
          user_id: user.id,
          title: form.title.trim() || "新的旅行",
          country: form.country.trim() || null,
          country_flag: form.country_flag.trim() || null,
          date_start: form.date_start || null,
          date_end: form.date_end || null,
          intro: form.intro.trim() || null,
          cover_emoji: form.cover_emoji.trim() || "✈️",
          sort_order: trips.length,
        })
        .select("*")
        .single();
      if (error) throw error;
      setTrips((current) => sortTravelTrips([{ ...(data as TravelTrip), places: [] }, ...current]));
      setForm(emptyTripForm);
      setDialogOpen(false);
      toast({ title: "已新增旅行", tone: "success" });
    } catch (error) {
      toast({ title: "新增旅行失败", description: getErrorMessage(error), tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-72 items-center justify-center text-ink-2">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        正在打开我的旅行
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="grid min-h-[420px] items-center gap-8 rounded-[30px] border border-line bg-gradient-to-br from-[#FCEEF0] via-white to-blue-soft/70 px-6 py-8 shadow-milk lg:grid-cols-[1fr_360px] lg:px-10">
        <div className="max-w-2xl">
          <span className="inline-flex rounded-pill bg-white/70 px-4 py-1.5 text-xs font-extrabold text-mint-deep shadow-sm">
            travel journal
          </span>
          <h1 className="mt-5 font-display text-[clamp(2.6rem,8vw,5.4rem)] font-extrabold leading-[0.98] text-ink">
            我的旅行
          </h1>
          <p className="mt-5 max-w-xl text-lg font-semibold leading-9 text-ink-2">
            转一转我的足迹星球，再往下逛每一趟。城市、餐厅、地址和小心情都慢慢放进来。
          </p>
          <div className="mt-6 grid max-w-md grid-cols-3 gap-3">
            {stats.map((item) => (
              <div key={item.label} className="rounded-[18px] border border-line bg-white/75 px-4 py-3 text-center shadow-sm">
                <p className="font-display text-3xl font-extrabold text-ink">{item.value}</p>
                <p className="mt-1 text-xs font-extrabold text-slate">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
        <TravelGlobe />
      </section>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-extrabold text-ink">
              <CalendarDays className="h-4 w-4 text-mint-deep" />
              时间
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <FilterChip active={filter.year === "all"} onClick={() => setFilter((current) => ({ ...current, year: "all" }))}>
                全部
              </FilterChip>
              {years.map((year) => (
                <FilterChip key={year} active={filter.year === year} onClick={() => setFilter((current) => ({ ...current, year }))}>
                  {year}
                </FilterChip>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-extrabold text-ink">
              <MapPin className="h-4 w-4 text-pink-deep" />
              国家
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <FilterChip active={filter.country === "all"} onClick={() => setFilter((current) => ({ ...current, country: "all" }))}>
                全部
              </FilterChip>
              {countries.map((country) => (
                <FilterChip key={country} active={filter.country === country} onClick={() => setFilter((current) => ({ ...current, country }))}>
                  {country}
                </FilterChip>
              ))}
            </div>
          </div>
          <Button variant="pink" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            新增旅行
          </Button>
        </div>

        {filteredTrips.length > 0 ? (
          <div className="space-y-5">
            {filteredTrips.map((trip) => (
              <TripRail key={trip.id} trip={trip} />
            ))}
          </div>
        ) : (
          <Card className="border-mint-line bg-mint-soft/35">
            <CardContent className="grid min-h-56 place-items-center p-8 text-center">
              <div>
                <Sparkles className="mx-auto mb-3 h-8 w-8 text-mint-deep" />
                <h2 className="font-display text-2xl font-extrabold text-ink">还没有旅行记录</h2>
                <p className="mt-2 text-sm font-semibold text-slate">先加一趟旅行，再进去放地点、照片和视频。</p>
                <Button className="mt-5" onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4" />
                  新增旅行
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增旅行</DialogTitle>
            <DialogDescription>先建一趟旅程，进去后再加每天的地点、照片和视频。</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={saveTrip}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="travel-title">旅程名称</Label>
                <Input id="travel-title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="京都 · 2025 秋" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="travel-country">国家</Label>
                <Input id="travel-country" value={form.country} onChange={(event) => setForm((current) => ({ ...current, country: event.target.value }))} placeholder="日本" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="travel-flag">国旗/封面符号</Label>
                <Input id="travel-flag" value={form.country_flag} onChange={(event) => setForm((current) => ({ ...current, country_flag: event.target.value }))} placeholder="🇯🇵" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="travel-cover">卡片符号</Label>
                <Input id="travel-cover" value={form.cover_emoji} onChange={(event) => setForm((current) => ({ ...current, cover_emoji: event.target.value }))} placeholder="⛩️" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="travel-start">开始日期</Label>
                <Input id="travel-start" type="date" value={form.date_start} onChange={(event) => setForm((current) => ({ ...current, date_start: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="travel-end">结束日期</Label>
                <Input id="travel-end" type="date" value={form.date_end} onChange={(event) => setForm((current) => ({ ...current, date_end: event.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="travel-intro">一句话介绍</Label>
              <Textarea id="travel-intro" value={form.intro} onChange={(event) => setForm((current) => ({ ...current, intro: event.target.value }))} placeholder="一条时间线从中间一路往下，左右交替记下每一天去了哪。" />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              保存旅行
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
