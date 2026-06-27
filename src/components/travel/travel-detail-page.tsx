"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Loader2, MapPin, Plus, Trash2 } from "lucide-react";
import { EditableText } from "@/components/editable-text";
import { TravelMedia } from "@/components/travel/travel-media";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { todayKey } from "@/lib/dates";
import { supabase } from "@/lib/supabase";
import type { TravelMediaKind, TravelPlace, TravelPlaceMedia, TravelPlaceType, TravelTrip, Visibility } from "@/lib/types";
import {
  getMediaPlatform,
  sortTravelPlaces,
  travelTypeMeta,
  travelTextDefaults,
  travelTypeOptions,
  type TravelTextSlot,
  type TravelPlaceWithMedia,
} from "@/lib/travel";
import { cn } from "@/lib/utils";

type CurveState = {
  width: number;
  height: number;
  path: string;
  stems: Array<{ x1: number; y1: number; x2: number; y2: number }>;
  nodes: Array<{ x: number; y: number; color: string }>;
};

type TravelTextMap = Record<TravelTextSlot, string>;

const emptyPlaceForm = {
  day_label: "Day 1",
  date_label: "",
  type: "打卡地",
  type_color: "see" as TravelPlaceType,
  name: "",
  address: "",
  mood: "",
  visibility: "private" as Visibility,
  videos: "",
};

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

function getTextFallback(slot: TravelTextSlot) {
  return travelTextDefaults[slot];
}

function groupPlaces(places: TravelPlace[], media: TravelPlaceMedia[]) {
  const mediaByPlace = new Map<string, TravelPlaceMedia[]>();
  for (const item of media) {
    const list = mediaByPlace.get(item.place_id) ?? [];
    list.push(item);
    mediaByPlace.set(item.place_id, list);
  }

  return sortTravelPlaces(
    places.map((place) => ({
      ...place,
      media: (mediaByPlace.get(place.id) ?? []).sort((a, b) => a.sort_order - b.sort_order),
    })),
  );
}

function VisibilityButton({
  value,
  onChange,
}: {
  value: Visibility;
  onChange: (value: Visibility) => Promise<void>;
}) {
  return (
    <Button
      variant={value === "private" ? "outline" : "softBlue"}
      size="sm"
      className="min-h-8 px-3 text-[11px]"
      onClick={() => onChange(value === "private" ? "public" : "private")}
    >
      {value === "private" ? "🔒 私密" : "🌐 公开"}
    </Button>
  );
}

function buildPath(lineX: number, height: number, nodes: CurveState["nodes"]) {
  if (nodes.length === 0) return "";
  const topY = Math.max(0, nodes[0].y - 40);
  const bottomY = Math.min(height, nodes[nodes.length - 1].y + 40);
  let path = `M ${lineX.toFixed(1)} ${topY.toFixed(1)}`;
  let previousY = topY;

  nodes.forEach((node, index) => {
    const bow = index % 2 ? -12 : 12;
    path += ` C ${(lineX + bow).toFixed(1)} ${(previousY + (node.y - previousY) * 0.4).toFixed(1)} ${(lineX + bow).toFixed(1)} ${(node.y - (node.y - previousY) * 0.4).toFixed(1)} ${lineX.toFixed(1)} ${node.y.toFixed(1)}`;
    previousY = node.y;
  });

  const bow = nodes.length % 2 ? -12 : 12;
  path += ` C ${(lineX + bow).toFixed(1)} ${(previousY + (bottomY - previousY) * 0.4).toFixed(1)} ${(lineX + bow).toFixed(1)} ${(bottomY - (bottomY - previousY) * 0.4).toFixed(1)} ${lineX.toFixed(1)} ${bottomY.toFixed(1)}`;
  return path;
}

function PlaceCard({
  place,
  texts,
  onSaveText,
  onUpdate,
  onAddVideo,
  onAddPhotos,
  onDeleteMedia,
  onDelete,
}: {
  place: TravelPlaceWithMedia;
  texts: TravelTextMap;
  onSaveText: (slot: TravelTextSlot, content: string) => Promise<void>;
  onUpdate: (id: string, patch: Partial<TravelPlace>) => Promise<void>;
  onAddVideo: (place: TravelPlaceWithMedia, url: string) => Promise<void>;
  onAddPhotos: (place: TravelPlaceWithMedia, files: FileList) => Promise<void>;
  onDeleteMedia: (mediaId: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const photos = place.media.filter((item) => item.kind === "photo");
  const videos = place.media.filter((item) => item.kind === "video");
  const meta = travelTypeMeta[place.type_color] ?? travelTypeMeta.see;

  return (
    <Card className="travel-card overflow-hidden rounded-[15px] border-line bg-white/95 shadow-milk" data-travel-card>
      <CardContent className="space-y-3 p-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className={cn("h-5 w-1.5 shrink-0 rounded-full", meta.barClassName)} />
            <EditableText
              aria-label="地点类型"
              value={place.type}
              onSave={(value) => onUpdate(place.id, { type: value || meta.label })}
              inputClassName="h-9 rounded-pill px-2 text-sm font-extrabold text-ink"
            />
          </div>
          <div className="flex shrink-0 gap-2">
            <Select
              value={place.type_color}
              onValueChange={(value) => {
                const next = value as TravelPlaceType;
                void onUpdate(place.id, { type_color: next, type: place.type || travelTypeMeta[next].label });
              }}
            >
              <SelectTrigger className="h-9 w-28 rounded-pill px-3 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {travelTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <VisibilityButton value={place.visibility} onChange={(visibility) => onUpdate(place.id, { visibility })} />
          </div>
        </div>

        <TravelMedia
          placeName={place.name}
          photos={photos}
          videos={videos}
          texts={texts}
          onSaveText={onSaveText}
          onAddVideo={(url) => onAddVideo(place, url)}
          onAddPhotos={(files) => onAddPhotos(place, files)}
          onDeleteMedia={onDeleteMedia}
        />

        <EditableText
          aria-label="地点名"
          value={place.name}
          onSave={(value) => onUpdate(place.id, { name: value || "未命名地点" })}
          inputClassName="font-display text-base font-extrabold leading-tight text-ink"
        />
        <EditableText
          aria-label="地点地址"
          value={place.address ?? ""}
          onSave={(value) => onUpdate(place.id, { address: value || null })}
          inputClassName="text-[11.5px] font-bold text-ink-2"
          placeholder="📍 地址"
        />
        <EditableText
          aria-label="地点心情"
          value={place.mood ?? ""}
          multiline
          onSave={(value) => onUpdate(place.id, { mood: value || null })}
          inputClassName="min-h-20 rounded-[11px] bg-line-2 px-3 py-2 text-xs italic leading-6 text-ink-2"
          placeholder="今天在这里的心情..."
        />

        <div className="flex justify-end border-t border-line/80 pt-3">
          <Button variant="danger" size="sm" onClick={() => onDelete(place.id)}>
            <Trash2 className="h-4 w-4" />
            删除地点
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function DayColumn({
  place,
  align,
  onUpdate,
}: {
  place: TravelPlaceWithMedia;
  align: "left" | "right";
  onUpdate: (id: string, patch: Partial<TravelPlace>) => Promise<void>;
}) {
  return (
    <div
      className={cn(
        "travel-daycol space-y-1 pt-[11px] text-sm font-extrabold",
        align === "right" ? "text-right" : "text-left",
      )}
      data-travel-day
    >
      <EditableText
        aria-label="Day 标签"
        value={place.day_label}
        onSave={(value) => onUpdate(place.id, { day_label: value || "Day" })}
        inputClassName={cn("h-7 rounded-md bg-transparent px-1 font-display text-[15px] font-extrabold leading-none text-ink", align === "right" && "text-right")}
      />
      <EditableText
        aria-label="日期标签"
        value={place.date_label}
        onSave={(value) => onUpdate(place.id, { date_label: value })}
        inputClassName={cn("h-7 rounded-md bg-transparent px-1 text-[11px] font-extrabold text-slate", align === "right" && "text-right")}
        placeholder="10.18"
      />
    </div>
  );
}

export function TravelDetailPage({ tripId }: { tripId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const rowsRef = useRef<HTMLDivElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const curveFrameRef = useRef<number | null>(null);
  const [trip, setTrip] = useState<TravelTrip | null>(null);
  const [places, setPlaces] = useState<TravelPlaceWithMedia[]>([]);
  const [texts, setTexts] = useState<TravelTextMap>(travelTextDefaults);
  const [loading, setLoading] = useState(true);
  const [curve, setCurve] = useState<CurveState | null>(null);
  const [narrow, setNarrow] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyPlaceForm);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [savingPlace, setSavingPlace] = useState(false);
  const textSlots = useMemo(() => Object.keys(travelTextDefaults) as TravelTextSlot[], []);

  const load = useCallback(async () => {
    if (!supabase || !user) return;
    setLoading(true);
    const [tripResult, placesResult, textsResult] = await Promise.all([
      supabase.from("trips").select("*").eq("id", tripId).eq("user_id", user.id).maybeSingle(),
      supabase
        .from("places")
        .select("*")
        .eq("trip_id", tripId)
        .eq("user_id", user.id)
        .order("sort_order", { ascending: true }),
      supabase.from("site_texts").select("slot, content").eq("user_id", user.id).in("slot", textSlots),
    ]);

    if (!textsResult.error) {
      setTexts(mergeTexts(textsResult.data));
    }

    const error = tripResult.error || placesResult.error;
    if (error) {
      toast({ title: "旅行详情读取失败", description: error.message, tone: "error" });
      setLoading(false);
      return;
    }

    const placeRows = (placesResult.data ?? []) as TravelPlace[];
    const placeIds = placeRows.map((place) => place.id);
    let mediaRows: TravelPlaceMedia[] = [];
    if (placeIds.length > 0) {
      const { data, error: mediaError } = await supabase
        .from("place_media")
        .select("*")
        .in("place_id", placeIds)
        .eq("user_id", user.id)
        .order("sort_order", { ascending: true });
      if (mediaError) {
        toast({ title: "地点媒体读取失败", description: mediaError.message, tone: "error" });
      } else {
        mediaRows = (data ?? []) as TravelPlaceMedia[];
      }
    }

    setTrip((tripResult.data ?? null) as TravelTrip | null);
    setPlaces(groupPlaces(placeRows, mediaRows));
    setLoading(false);
  }, [textSlots, toast, tripId, user]);

  const buildCurve = useCallback(() => {
    const rows = rowsRef.current;
    if (!rows) return;
    const rowElements = Array.from(rows.querySelectorAll<HTMLElement>("[data-travel-row]"));
    if (rowElements.length === 0) {
      setCurve(null);
      return;
    }

    const base = rows.getBoundingClientRect();
    const width = base.width;
    const height = base.height;
    const nextNarrow = width < 720;
    setNarrow((current) => (current === nextNarrow ? current : nextNarrow));

    const firstDay = rowElements[0].querySelector<HTMLElement>("[data-travel-day]");
    const firstCard = rowElements[0].querySelector<HTMLElement>("[data-travel-card]");
    const lineX =
      nextNarrow && firstDay && firstCard
        ? (firstDay.getBoundingClientRect().right + firstCard.getBoundingClientRect().left) / 2 - base.left
        : width / 2;

    const nodes: CurveState["nodes"] = [];
    const stems: CurveState["stems"] = [];

    rowElements.forEach((row) => {
      const day = row.querySelector<HTMLElement>("[data-travel-day]");
      const card = row.querySelector<HTMLElement>("[data-travel-card]");
      if (!day || !card) return;
      const dayRect = day.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const y = (dayRect.top + dayRect.bottom) / 2 - base.top;
      const leftCard = !nextNarrow && row.dataset.side === "left";
      const cardX = (leftCard ? cardRect.right : cardRect.left) - base.left;
      const dayX = (leftCard ? dayRect.left : dayRect.right) - base.left;
      const color = row.dataset.color ?? "#A8D8C0";

      nodes.push({ x: lineX, y, color });
      stems.push({ x1: lineX, y1: y, x2: cardX, y2: y });
      stems.push({ x1: lineX, y1: y, x2: dayX, y2: y });
    });

    setCurve({ width, height, stems, nodes, path: buildPath(lineX, height, nodes) });
  }, []);

  const scheduleCurve = useCallback(() => {
    if (curveFrameRef.current) {
      window.cancelAnimationFrame(curveFrameRef.current);
    }
    curveFrameRef.current = window.requestAnimationFrame(() => {
      curveFrameRef.current = window.requestAnimationFrame(buildCurve);
    });
  }, [buildCurve]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    scheduleCurve();
  }, [places, trip, narrow, scheduleCurve]);

  useEffect(() => {
    const rows = rowsRef.current;
    if (!rows) return;
    const observer = new ResizeObserver(scheduleCurve);
    observer.observe(rows);
    window.addEventListener("resize", scheduleCurve);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", scheduleCurve);
      if (curveFrameRef.current) {
        window.cancelAnimationFrame(curveFrameRef.current);
      }
    };
  }, [scheduleCurve]);

  const nextPlacePosition = useMemo(
    () => (places.length ? Math.max(...places.map((place) => place.sort_order)) + 1 : 0),
    [places],
  );
  const nextDayLabel = useMemo(() => `Day ${places.length + 1}`, [places.length]);

  async function updateTrip(patch: Partial<TravelTrip>) {
    if (!supabase || !trip) return;
    setTrip((current) => (current ? { ...current, ...patch } : current));
    const { error } = await supabase.from("trips").update(patch).eq("id", trip.id);
    if (error) {
      toast({ title: "旅程保存失败", description: error.message, tone: "error" });
      await load();
    } else {
      toast({ title: "已保存", tone: "success" });
    }
  }

  async function saveText(slot: TravelTextSlot, content: string) {
    if (!supabase || !user) return;
    const nextContent = content || getTextFallback(slot);
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

  async function updatePlace(id: string, patch: Partial<TravelPlace>) {
    if (!supabase) return;
    setPlaces((current) => current.map((place) => (place.id === id ? { ...place, ...patch } : place)));
    const { error } = await supabase.from("places").update(patch).eq("id", id);
    if (error) {
      toast({ title: "地点保存失败", description: error.message, tone: "error" });
      await load();
    } else {
      toast({ title: "已保存", tone: "success" });
      scheduleCurve();
    }
  }

  async function uploadPhotos(placeId: string, files: FileList | File[]) {
    if (!supabase || !user) return [];
    const uploaded: Array<{ kind: TravelMediaKind; url: string; platform: string | null; sort_order: number }> = [];
    const fileList = Array.from(files);
    for (const [index, file] of fileList.entries()) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const path = `${user.id}/${placeId}/${Date.now()}-${index}-${safeName}`;
      const { error } = await supabase.storage.from("travel-photos").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("travel-photos").getPublicUrl(path);
      uploaded.push({ kind: "photo", url: data.publicUrl, platform: null, sort_order: index });
    }
    return uploaded;
  }

  async function addVideo(place: TravelPlaceWithMedia, url: string) {
    if (!supabase || !user) return;
    try {
      const { error } = await supabase.from("place_media").insert({
        user_id: user.id,
        place_id: place.id,
        kind: "video",
        url,
        platform: getMediaPlatform(url),
        sort_order: place.media.length,
      });
      if (error) throw error;
      toast({ title: "已新增视频", tone: "success" });
      await load();
    } catch (error) {
      toast({ title: "新增视频失败", description: getErrorMessage(error), tone: "error" });
    }
  }

  async function addPhotos(place: TravelPlaceWithMedia, files: FileList) {
    if (!supabase || !user) return;
    try {
      const uploaded = await uploadPhotos(place.id, files);
      if (uploaded.length > 0) {
        const { error } = await supabase.from("place_media").insert(
          uploaded.map((item, index) => ({
            user_id: user.id,
            place_id: place.id,
            kind: item.kind,
            url: item.url,
            platform: item.platform,
            sort_order: place.media.length + index,
          })),
        );
        if (error) throw error;
      }
      toast({ title: "照片已上传", tone: "success" });
      await load();
    } catch (error) {
      toast({ title: "照片上传失败", description: getErrorMessage(error), tone: "error" });
    }
  }

  async function deleteMedia(mediaId: string) {
    if (!supabase) return;
    const { error } = await supabase.from("place_media").delete().eq("id", mediaId);
    if (error) {
      toast({ title: "删除媒体失败", description: error.message, tone: "error" });
      return;
    }
    toast({ title: "已删除媒体", tone: "success" });
    await load();
  }

  async function deletePlace(id: string) {
    if (!supabase || !confirm("删除这个地点？")) return;
    const { error } = await supabase.from("places").delete().eq("id", id);
    if (error) {
      toast({ title: "删除地点失败", description: error.message, tone: "error" });
      return;
    }
    toast({ title: "已删除地点", tone: "success" });
    await load();
  }

  async function savePlace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !user || !trip) return;
    setSavingPlace(true);
    try {
      const { data, error } = await supabase
        .from("places")
        .insert({
          user_id: user.id,
          trip_id: trip.id,
          day_label: form.day_label.trim() || nextDayLabel,
          date_label: form.date_label.trim(),
          type: form.type.trim() || travelTypeMeta[form.type_color].label,
          type_color: form.type_color,
          name: form.name.trim() || "新的地点",
          address: form.address.trim() || null,
          mood: form.mood.trim() || null,
          visibility: form.visibility,
          sort_order: nextPlacePosition,
        })
        .select("*")
        .single();
      if (error) throw error;

      const place = data as TravelPlace;
      const mediaRows: Array<{
        user_id: string;
        place_id: string;
        kind: TravelMediaKind;
        url: string;
        platform: string | null;
        sort_order: number;
      }> = [];

      const uploaded = await uploadPhotos(place.id, photoFiles);
      uploaded.forEach((item, index) => {
        mediaRows.push({ user_id: user.id, place_id: place.id, ...item, sort_order: index });
      });

      form.videos
        .split(/\n+/)
        .map((value) => value.trim())
        .filter(Boolean)
        .forEach((url, index) => {
          mediaRows.push({
            user_id: user.id,
            place_id: place.id,
            kind: "video",
            url,
            platform: getMediaPlatform(url),
            sort_order: uploaded.length + index,
          });
        });

      if (mediaRows.length > 0) {
        const { error: mediaError } = await supabase.from("place_media").insert(mediaRows);
        if (mediaError) throw mediaError;
      }

      setDialogOpen(false);
      setForm({ ...emptyPlaceForm, day_label: nextDayLabel });
      setPhotoFiles([]);
      toast({ title: "已新增地点", tone: "success" });
      await load();
    } catch (error) {
      toast({ title: "新增地点失败", description: getErrorMessage(error), tone: "error" });
    } finally {
      setSavingPlace(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-72 items-center justify-center text-ink-2">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        正在打开旅行详情
      </div>
    );
  }

  if (!trip) {
    return (
      <Card className="border-mint-line bg-mint-soft/35">
        <CardContent className="p-8 text-center">
          <h1 className="font-display text-2xl font-extrabold text-ink">没有找到这趟旅行</h1>
          <Button className="mt-5" asChild>
            <Link href="/app/travel">
              <ArrowLeft className="h-4 w-4" />
              返回我的旅行
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" asChild>
          <Link href="/app/travel">
            <ArrowLeft className="h-4 w-4" />
            {texts.travel_detail_back}
          </Link>
        </Button>
        <Button variant="pink" onClick={() => {
          setForm({ ...emptyPlaceForm, day_label: nextDayLabel, date_label: todayKey().slice(5).replace("-", ".") });
          setDialogOpen(true);
        }}>
          <Plus className="h-4 w-4" />
          {texts.travel_add_place}
        </Button>
      </div>

      <section className="pt-2">
        <EditableText
          aria-label="旅行详情小标签"
          value={texts.travel_detail_badge}
          onSave={(value) => saveText("travel_detail_badge", value)}
          inputClassName="inline-flex w-auto rounded-pill bg-white/80 px-4 py-1.5 text-xs font-extrabold text-mint-deep shadow-sm"
        />
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="max-w-2xl">
            <EditableText
              aria-label="旅程标题"
              value={trip.title}
              onSave={(value) => updateTrip({ title: value || "未命名旅行" })}
              inputClassName="font-display text-[clamp(1.5rem,3.3vw,2.125rem)] font-extrabold leading-tight text-ink"
            />
            <EditableText
              aria-label="旅程简介"
              value={trip.intro ?? ""}
              multiline
              onSave={(value) => updateTrip({ intro: value || null })}
              inputClassName="mt-2 max-w-[580px] text-xs italic leading-6 text-ink-2"
              placeholder="一条时间线从中间一路往下，左右交替记下每一天去了哪。"
            />
          </div>
          <div className="grid gap-2 text-xs font-extrabold sm:grid-cols-2 lg:w-72">
            <Input
              type="date"
              value={trip.date_start ?? ""}
              onChange={(event) => updateTrip({ date_start: event.target.value || null })}
              className="h-10 rounded-pill bg-white px-3 py-2 text-xs font-extrabold text-slate shadow-sm"
              aria-label="旅行开始日期"
            />
            <Input
              type="date"
              value={trip.date_end ?? ""}
              onChange={(event) => updateTrip({ date_end: event.target.value || null })}
              className="h-10 rounded-pill bg-white px-3 py-2 text-xs font-extrabold text-slate shadow-sm"
              aria-label="旅行结束日期"
            />
            <span className="flex items-center gap-1 rounded-pill bg-mint-soft px-2 py-1 text-mint-deep shadow-sm sm:col-span-2">
              <EditableText
                aria-label="旅行详情国旗"
                value={trip.country_flag ?? ""}
                onSave={(value) => updateTrip({ country_flag: value || null })}
                inputClassName="h-8 w-12 rounded-pill px-1 text-center text-xs font-extrabold text-mint-deep"
                placeholder="🇯🇵"
              />
              <EditableText
                aria-label="旅行详情国家"
                value={trip.country ?? ""}
                onSave={(value) => updateTrip({ country: value || null })}
                inputClassName="h-8 rounded-pill px-2 text-xs font-extrabold text-mint-deep"
                placeholder="国家未定"
              />
            </span>
          </div>
        </div>
      </section>

      <section ref={timelineRef} className="relative mx-auto max-w-[900px] overflow-visible pt-2">
        {places.length === 0 ? (
          <div className="grid min-h-72 place-items-center text-center">
            <div>
              <MapPin className="mx-auto mb-3 h-8 w-8 text-mint-deep" />
              <EditableText
                aria-label="旅行详情空状态标题"
                value={texts.travel_empty_places_title}
                onSave={(value) => saveText("travel_empty_places_title", value)}
                inputClassName="font-display text-2xl font-extrabold text-ink"
              />
              <EditableText
                aria-label="旅行详情空状态描述"
                value={texts.travel_empty_places_desc}
                onSave={(value) => saveText("travel_empty_places_desc", value)}
                inputClassName="mt-2 text-sm font-semibold text-slate"
              />
              <Button className="mt-5" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                {texts.travel_add_place}
              </Button>
            </div>
          </div>
        ) : (
          <div className="relative">
            {curve ? (
              <svg
                className="pointer-events-none absolute left-0 top-0 z-0"
                width={curve.width}
                height={curve.height}
                viewBox={`0 0 ${curve.width} ${curve.height}`}
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="travelTimelineFlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#A8D8C0" />
                    <stop offset="0.5" stopColor="#E79CB8" />
                    <stop offset="1" stopColor="#C3A4DD" />
                  </linearGradient>
                </defs>
                {curve.stems.map((stem, index) => (
                  <line
                    key={index}
                    x1={stem.x1}
                    y1={stem.y1}
                    x2={stem.x2}
                    y2={stem.y2}
                    stroke="#EAD9D6"
                    strokeWidth="1.5"
                  />
                ))}
                <path d={curve.path} fill="none" stroke="url(#travelTimelineFlow)" strokeLinecap="round" strokeWidth="2.8" />
                {curve.nodes.map((node, index) => (
                  <g key={index}>
                    <circle cx={node.x} cy={node.y} r="7.5" fill="#fff" stroke={node.color} strokeWidth="2.4" />
                    <circle cx={node.x} cy={node.y} r="3" fill={node.color} />
                  </g>
                ))}
              </svg>
            ) : null}

            <div ref={rowsRef} className="relative z-10">
              {places.map((place, index) => {
                const side = index % 2 === 0 ? "left" : "right";
                const meta = travelTypeMeta[place.type_color] ?? travelTypeMeta.see;
                const rowClassName = narrow
                  ? "mb-[30px] grid grid-cols-[50px_minmax(0,1fr)] items-start gap-x-[13px]"
                  : "mb-[30px] grid grid-cols-2 items-start gap-x-16";

                return (
                  <div
                    key={place.id}
                    data-travel-row
                    data-side={side}
                    data-color={meta.color}
                    className={rowClassName}
                  >
                    {narrow ? (
                      <>
                        <DayColumn place={place} align="right" onUpdate={updatePlace} />
                        <PlaceCard
                          place={place}
                          texts={texts}
                          onSaveText={saveText}
                          onUpdate={updatePlace}
                          onAddVideo={addVideo}
                          onAddPhotos={addPhotos}
                          onDeleteMedia={deleteMedia}
                          onDelete={deletePlace}
                        />
                      </>
                    ) : side === "left" ? (
                      <>
                        <PlaceCard
                          place={place}
                          texts={texts}
                          onSaveText={saveText}
                          onUpdate={updatePlace}
                          onAddVideo={addVideo}
                          onAddPhotos={addPhotos}
                          onDeleteMedia={deleteMedia}
                          onDelete={deletePlace}
                        />
                        <DayColumn place={place} align="left" onUpdate={updatePlace} />
                      </>
                    ) : (
                      <>
                        <DayColumn place={place} align="right" onUpdate={updatePlace} />
                        <PlaceCard
                          place={place}
                          texts={texts}
                          onSaveText={saveText}
                          onUpdate={updatePlace}
                          onAddVideo={addVideo}
                          onAddPhotos={addPhotos}
                          onDeleteMedia={deleteMedia}
                          onDelete={deletePlace}
                        />
                      </>
                    )}
                  </div>
                );
              })}

              <div
                data-travel-row
                data-side={places.length % 2 === 0 ? "left" : "right"}
                data-color="#A8D8C0"
                className={narrow ? "mb-[30px] grid grid-cols-[50px_minmax(0,1fr)] items-start gap-x-[13px]" : "mb-[30px] grid grid-cols-2 items-start gap-x-16"}
              >
                {narrow ? (
                  <>
                    <div className="travel-daycol text-right" data-travel-day>
                      <span className="block rounded-pill bg-white/80 px-3 py-2 text-xs font-extrabold text-mint-deep">＋</span>
                      <span className="mt-2 block rounded-pill bg-white/80 px-3 py-2 text-xs font-extrabold text-slate">
                        {texts.travel_add_card_date}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="travel-card grid min-h-40 place-items-center rounded-[15px] border border-dashed border-mint-line bg-white p-6 text-center hover:bg-mint-soft"
                      data-travel-card
                      onClick={() => setDialogOpen(true)}
                    >
                      <span className="font-display text-4xl font-extrabold text-mint-deep">＋</span>
                      <span className="mt-2 block text-sm font-extrabold text-ink">{texts.travel_add_place}</span>
                    </button>
                  </>
                ) : places.length % 2 === 0 ? (
                  <>
                    <button
                      type="button"
                      className="travel-card grid min-h-40 place-items-center rounded-[15px] border border-dashed border-mint-line bg-white p-6 text-center hover:bg-mint-soft"
                      data-travel-card
                      onClick={() => setDialogOpen(true)}
                    >
                      <span className="font-display text-4xl font-extrabold text-mint-deep">＋</span>
                      <span className="mt-2 block text-sm font-extrabold text-ink">{texts.travel_add_place}</span>
                    </button>
                    <div className="travel-daycol" data-travel-day>
                      <span className="block rounded-pill bg-white/80 px-3 py-2 text-xs font-extrabold text-mint-deep">＋</span>
                      <span className="mt-2 block rounded-pill bg-white/80 px-3 py-2 text-xs font-extrabold text-slate">
                        {texts.travel_add_card_date}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="travel-daycol text-right" data-travel-day>
                      <span className="block rounded-pill bg-white/80 px-3 py-2 text-xs font-extrabold text-mint-deep">＋</span>
                      <span className="mt-2 block rounded-pill bg-white/80 px-3 py-2 text-xs font-extrabold text-slate">
                        {texts.travel_add_card_date}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="travel-card grid min-h-40 place-items-center rounded-[15px] border border-dashed border-mint-line bg-white p-6 text-center hover:bg-mint-soft"
                      data-travel-card
                      onClick={() => setDialogOpen(true)}
                    >
                      <span className="font-display text-4xl font-extrabold text-mint-deep">＋</span>
                      <span className="mt-2 block text-sm font-extrabold text-ink">{texts.travel_add_place}</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle asChild>
              <EditableText
                aria-label="加地点弹窗标题"
                value={texts.travel_place_dialog_title}
                onSave={(value) => saveText("travel_place_dialog_title", value)}
                inputClassName="font-display text-2xl font-extrabold text-ink"
              />
            </DialogTitle>
            <DialogDescription asChild>
              <EditableText
                aria-label="加地点弹窗说明"
                value={texts.travel_place_dialog_desc}
                onSave={(value) => saveText("travel_place_dialog_desc", value)}
                inputClassName="text-sm text-slate"
              />
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={savePlace}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="place-day">Day</Label>
                <Input id="place-day" value={form.day_label} onChange={(event) => setForm((current) => ({ ...current, day_label: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="place-date">日期标签</Label>
                <Input id="place-date" value={form.date_label} onChange={(event) => setForm((current) => ({ ...current, date_label: event.target.value }))} placeholder="10.18" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="place-type">类型名称</Label>
                <Input id="place-type" value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>类型颜色</Label>
                <Select value={form.type_color} onValueChange={(value) => setForm((current) => ({ ...current, type_color: value as TravelPlaceType, type: current.type || travelTypeMeta[value as TravelPlaceType].label }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {travelTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="place-name">地点名</Label>
              <Input id="place-name" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Hotel Kanra Kyoto" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="place-address">地址</Label>
              <Input id="place-address" value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} placeholder="📍 京都市下京区" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="place-mood">心情</Label>
              <Textarea id="place-mood" value={form.mood} onChange={(event) => setForm((current) => ({ ...current, mood: event.target.value }))} placeholder="夜里风铃叮当，像把整座城市关在门外。" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="place-photos">照片</Label>
              <Input
                id="place-photos"
                type="file"
                multiple
                accept="image/*"
                onChange={(event) => setPhotoFiles(Array.from(event.target.files ?? []))}
              />
              {photoFiles.length ? <p className="text-xs font-bold text-slate">已选 {photoFiles.length} 张照片</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="place-videos">视频链接</Label>
              <Textarea
                id="place-videos"
                value={form.videos}
                onChange={(event) => setForm((current) => ({ ...current, videos: event.target.value }))}
                placeholder="一行一个 YouTube / B站 / 小红书链接"
              />
            </div>
            <Button type="submit" disabled={savingPlace}>
              {savingPlace ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {texts.travel_place_dialog_save}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
