"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, Loader2, MapPin, Plus, Sparkles } from "lucide-react";
import { EditableText } from "@/components/editable-text";
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
  travelTextDefaults,
  type TravelTextSlot,
  type TravelPlaceWithMedia,
  type TravelTripWithPlaces,
} from "@/lib/travel";
import { cn } from "@/lib/utils";

type Filter = {
  year: string;
  country: string;
};

type TravelTextMap = Record<TravelTextSlot, string>;

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
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message: unknown }).message)
      : error instanceof Error
        ? error.message
        : "";
  if (message.includes("schema cache") || message.includes("relation") || message.includes("does not exist")) {
    return `数据库还没建好旅行表。请先运行 supabase/travel-expansion.sql，然后刷新页面再试。原始错误：${message}`;
  }
  if (message.includes("row-level security")) {
    return `数据库权限没有通过。请确认已经运行 supabase/travel-expansion.sql，并重新登录后再试。原始错误：${message}`;
  }
  if (message) return message;
  return "请稍后再试一次。";
}

function mergeTexts(rows: Array<{ slot: string; content: string }> | null | undefined) {
  const nextTexts: TravelTextMap = { ...travelTextDefaults };
  const slots = Object.keys(travelTextDefaults) as TravelTextSlot[];
  for (const row of rows ?? []) {
    if (slots.includes(row.slot as TravelTextSlot)) {
      nextTexts[row.slot as TravelTextSlot] = row.content;
    }
  }
  return nextTexts;
}

function getTravelTextFallback(slot: TravelTextSlot) {
  return travelTextDefaults[slot];
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

function FootprintTile({ trip, label }: { trip: TravelTripWithPlaces; label: string }) {
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
        {label}
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

function TripRail({
  trip,
  texts,
  onUpdate,
}: {
  trip: TravelTripWithPlaces;
  texts: TravelTextMap;
  onUpdate: (id: string, patch: Partial<TravelTrip>) => Promise<void>;
}) {
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
            <EditableText
              aria-label="旅行卡片标题"
              value={trip.title}
              onSave={(value) => onUpdate(trip.id, { title: value || "未命名旅行" })}
              inputClassName="font-display text-2xl font-extrabold text-ink"
            />
            <div className="mt-2 flex flex-wrap gap-2 text-xs font-extrabold text-slate">
              <span className="rounded-pill bg-line-2 px-3 py-1">{formatTripRange(trip)}</span>
              <span className="flex items-center gap-1 rounded-pill bg-mint-soft px-2 py-1 text-mint-deep">
                <EditableText
                  aria-label="旅行国旗"
                  value={trip.country_flag ?? ""}
                  onSave={(value) => onUpdate(trip.id, { country_flag: value || null })}
                  inputClassName="h-6 w-10 rounded-pill px-1 text-center text-xs font-extrabold text-mint-deep"
                  placeholder="🇯🇵"
                />
                <EditableText
                  aria-label="旅行国家"
                  value={trip.country ?? ""}
                  onSave={(value) => onUpdate(trip.id, { country: value || null })}
                  inputClassName="h-6 w-24 rounded-pill px-2 text-xs font-extrabold text-mint-deep"
                  placeholder="国家未定"
                />
              </span>
            </div>
          </div>
          <Button variant="softBlue" asChild>
            <Link href={`/app/travel/${trip.id}`}>
              {texts.travel_enter_detail}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
        <EditableText
          aria-label="旅行卡片简介"
          value={trip.intro ?? ""}
          multiline
          onSave={(value) => onUpdate(trip.id, { intro: value || null })}
          inputClassName="mb-5 text-sm font-semibold leading-7 text-ink-2"
          placeholder="写一句这趟旅行的感觉..."
        />

        <div className="flex gap-4 overflow-x-auto pb-2">
          <FootprintTile trip={trip} label={texts.travel_footprint_label} />
          {visibleTypes.map((type) => (
            <CategoryTile key={type} type={type} places={byType[type]} />
          ))}
          {visibleTypes.length === 0 ? (
            <div className="grid min-w-[160px] place-items-center rounded-[22px] border border-dashed border-line bg-line-2/50 p-5 text-center text-sm font-bold text-slate">
              {texts.travel_empty_tile}
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
  const [texts, setTexts] = useState<TravelTextMap>(travelTextDefaults);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>({ year: "all", country: "all" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyTripForm);
  const [saving, setSaving] = useState(false);
  const textSlots = useMemo(() => Object.keys(travelTextDefaults) as TravelTextSlot[], []);

  const load = useCallback(async () => {
    if (!supabase || !user) return;
    setLoading(true);
    const [tripsResult, placesResult, mediaResult, textsResult] = await Promise.all([
      supabase.from("trips").select("*").eq("user_id", user.id).order("sort_order", { ascending: true }).order("date_start", { ascending: false }),
      supabase.from("places").select("*").eq("user_id", user.id).order("sort_order", { ascending: true }),
      supabase.from("place_media").select("*").eq("user_id", user.id).order("sort_order", { ascending: true }),
      supabase.from("site_texts").select("slot, content").eq("user_id", user.id).in("slot", textSlots),
    ]);

    const error = tripsResult.error || placesResult.error || mediaResult.error;
    if (!textsResult.error) {
      setTexts(mergeTexts(textsResult.data));
    }
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
  }, [textSlots, toast, user]);

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
      { label: texts.travel_stat_countries, value: countryCount },
      { label: texts.travel_stat_trips, value: trips.length },
      { label: texts.travel_stat_places, value: placeCount },
    ];
  }, [texts.travel_stat_countries, texts.travel_stat_places, texts.travel_stat_trips, trips]);

  async function saveText(slot: TravelTextSlot, content: string) {
    if (!supabase || !user) return;
    const nextContent = content || getTravelTextFallback(slot);
    setTexts((current) => ({ ...current, [slot]: nextContent }));
    const { error } = await supabase.from("site_texts").upsert(
      { user_id: user.id, slot, content: nextContent, updated_at: new Date().toISOString() },
      { onConflict: "user_id,slot" },
    );
    if (error) {
      toast({ title: "文案保存失败", description: error.message, tone: "error" });
      await load();
    }
  }

  async function updateTrip(id: string, patch: Partial<TravelTrip>) {
    if (!supabase) return;
    setTrips((current) => current.map((trip) => (trip.id === id ? { ...trip, ...patch } : trip)));
    const { error } = await supabase.from("trips").update(patch).eq("id", id);
    if (error) {
      toast({ title: "旅行保存失败", description: getErrorMessage(error), tone: "error" });
      await load();
    } else {
      toast({ title: "已保存", tone: "success" });
    }
  }

  async function saveTrip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !user) {
      toast({ title: "新增旅行失败", description: "请先登录后再新增旅行。", tone: "error" });
      return;
    }
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
          <EditableText
            aria-label="旅行页小标签"
            value={texts.travel_overview_badge}
            onSave={(value) => saveText("travel_overview_badge", value)}
            inputClassName="inline-flex w-auto rounded-pill bg-white/70 px-4 py-1.5 text-xs font-extrabold text-mint-deep shadow-sm"
          />
          <EditableText
            aria-label="旅行页标题"
            value={texts.travel_overview_title}
            onSave={(value) => saveText("travel_overview_title", value)}
            inputClassName="mt-5 font-display text-[clamp(2.6rem,8vw,5.4rem)] font-extrabold leading-[0.98] text-ink"
          />
          <EditableText
            aria-label="旅行页介绍"
            value={texts.travel_overview_intro}
            onSave={(value) => saveText("travel_overview_intro", value)}
            multiline
            inputClassName="mt-5 max-w-xl text-lg font-semibold leading-9 text-ink-2"
          />
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
              <EditableText
                aria-label="时间筛选标题"
                value={texts.travel_filter_time}
                onSave={(value) => saveText("travel_filter_time", value)}
                inputClassName="h-8 rounded-pill px-2 text-sm font-extrabold text-ink"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <FilterChip active={filter.year === "all"} onClick={() => setFilter((current) => ({ ...current, year: "all" }))}>
                {texts.travel_filter_all}
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
              <EditableText
                aria-label="国家筛选标题"
                value={texts.travel_filter_country}
                onSave={(value) => saveText("travel_filter_country", value)}
                inputClassName="h-8 rounded-pill px-2 text-sm font-extrabold text-ink"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              <FilterChip active={filter.country === "all"} onClick={() => setFilter((current) => ({ ...current, country: "all" }))}>
                {texts.travel_filter_all}
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
            {texts.travel_add_trip}
          </Button>
        </div>

        {filteredTrips.length > 0 ? (
          <div className="space-y-5">
            {filteredTrips.map((trip) => (
              <TripRail key={trip.id} trip={trip} texts={texts} onUpdate={updateTrip} />
            ))}
          </div>
        ) : (
          <Card className="border-mint-line bg-mint-soft/35">
            <CardContent className="grid min-h-56 place-items-center p-8 text-center">
              <div>
                <Sparkles className="mx-auto mb-3 h-8 w-8 text-mint-deep" />
                <EditableText
                  aria-label="旅行空状态标题"
                  value={texts.travel_empty_title}
                  onSave={(value) => saveText("travel_empty_title", value)}
                  inputClassName="font-display text-2xl font-extrabold text-ink"
                />
                <EditableText
                  aria-label="旅行空状态描述"
                  value={texts.travel_empty_desc}
                  onSave={(value) => saveText("travel_empty_desc", value)}
                  inputClassName="mt-2 text-sm font-semibold text-slate"
                />
                <Button className="mt-5" onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4" />
                  {texts.travel_add_trip}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle asChild>
              <EditableText
                aria-label="新增旅行弹窗标题"
                value={texts.travel_trip_dialog_title}
                onSave={(value) => saveText("travel_trip_dialog_title", value)}
                inputClassName="font-display text-2xl font-extrabold text-ink"
              />
            </DialogTitle>
            <DialogDescription asChild>
              <EditableText
                aria-label="新增旅行弹窗说明"
                value={texts.travel_trip_dialog_desc}
                onSave={(value) => saveText("travel_trip_dialog_desc", value)}
                inputClassName="text-sm text-slate"
              />
            </DialogDescription>
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
              {texts.travel_trip_dialog_save}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
