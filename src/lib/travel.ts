import { parseVideoUrl } from "@/lib/video-embed";
import type { TravelPlace, TravelPlaceMedia, TravelPlaceType, TravelTrip } from "@/lib/types";

export type TravelPlaceWithMedia = TravelPlace & {
  media: TravelPlaceMedia[];
};

export type TravelTripWithPlaces = TravelTrip & {
  places: TravelPlaceWithMedia[];
};

export const travelTypeMeta: Record<
  TravelPlaceType,
  {
    label: string;
    chip: string;
    color: string;
    barClassName: string;
    softClassName: string;
    deepClassName: string;
    icon: string;
  }
> = {
  stay: {
    label: "住宿",
    chip: "住",
    color: "#5A8FC6",
    barClassName: "bg-blue",
    softClassName: "bg-blue-soft text-blue-deep border-blue-line",
    deepClassName: "text-blue-deep",
    icon: "🛏️",
  },
  food: {
    label: "美食",
    chip: "吃",
    color: "#CC6E96",
    barClassName: "bg-pink",
    softClassName: "bg-pink-soft text-pink-deep border-pink-line",
    deepClassName: "text-pink-deep",
    icon: "🥐",
  },
  see: {
    label: "打卡地",
    chip: "看",
    color: "#5C9F80",
    barClassName: "bg-mint",
    softClassName: "bg-mint-soft text-mint-deep border-mint-line",
    deepClassName: "text-mint-deep",
    icon: "🗺️",
  },
  shop: {
    label: "购物",
    chip: "买",
    color: "#8E63B8",
    barClassName: "bg-grape",
    softClassName: "bg-grape-soft text-grape-deep border-grape-line",
    deepClassName: "text-grape-deep",
    icon: "🛍️",
  },
};

export const travelTypeOptions = Object.entries(travelTypeMeta).map(([value, meta]) => ({
  value: value as TravelPlaceType,
  label: meta.label,
}));

export const travelTextDefaults = {
  travel_overview_badge: "travel journal",
  travel_overview_title: "我的旅行",
  travel_overview_intro: "转一转我的足迹星球，再往下逛每一趟",
  travel_stat_countries: "国家",
  travel_stat_trips: "城市",
  travel_stat_places: "地点",
  travel_planet_caption: "🌍 我的旅行星球",
  travel_planet_hint: "· 拖动旋转 ✶",
  travel_legend_one: "巴黎",
  travel_legend_two: "京都",
  travel_legend_three: "清迈",
  travel_filter_time: "时间",
  travel_filter_country: "国家",
  travel_filter_all: "全部",
  travel_add_trip: "新增旅行",
  travel_empty_title: "还没有旅行记录",
  travel_empty_desc: "先加一趟旅行，再进去放地点、照片和视频。",
  travel_enter_detail: "进入旅行详情",
  travel_footprint_label: "足迹地图",
  travel_empty_tile: "进入详情后加地点",
  travel_trip_dialog_title: "新增旅行",
  travel_trip_dialog_desc: "先建一趟旅程，进去后再加每天的地点、照片和视频。",
  travel_trip_dialog_save: "保存旅行",
  travel_detail_badge: "travel journal",
  travel_detail_back: "返回我的旅行",
  travel_detail_hint: "↓ 中间是时间线 · 卡片左右交替（从左开始）· 旁边标日期 · 点照片全屏翻图 ↓",
  travel_detail_footer: "只有照片就只显示照片、只有视频就只显示视频、都有才并排 · 照片自动裁切不变形 · 点图全屏",
  travel_add_place: "加一个地方",
  travel_add_card_hint: "只传照片/视频就单显示，都有才并排｜时间线继续往下长",
  travel_empty_places_title: "还没有地点",
  travel_empty_places_desc: "加第一个地点后，曲线时间线会自动长出来。",
  travel_add_card_date: "新地点",
  travel_place_dialog_title: "加一个地方",
  travel_place_dialog_desc: "照片会上传到 Supabase Storage，视频只保存外部链接。",
  travel_place_dialog_save: "保存地点",
  travel_media_photo_label: "📷 照片",
  travel_media_video_label: "🎬 视频",
  travel_media_empty: "加照片或视频后，这里会自动出现预览",
  travel_media_add_photo: "加照片",
  travel_media_uploading: "上传中...",
  travel_media_video_placeholder: "粘贴 YouTube / B站 / 小红书视频链接",
  travel_media_detected: "识别为：",
} as const;

export type TravelTextSlot = keyof typeof travelTextDefaults;

export function sortTravelPlaces(places: TravelPlaceWithMedia[]) {
  return [...places].sort(
    (a, b) =>
      a.sort_order - b.sort_order ||
      a.date_label.localeCompare(b.date_label) ||
      (a.created_at ?? "").localeCompare(b.created_at ?? ""),
  );
}

export function sortTravelTrips(trips: TravelTripWithPlaces[]) {
  return [...trips].sort(
    (a, b) =>
      a.sort_order - b.sort_order ||
      (b.date_start ?? "").localeCompare(a.date_start ?? "") ||
      (b.created_at ?? "").localeCompare(a.created_at ?? ""),
  );
}

export function getTripYear(trip: Pick<TravelTrip, "date_start" | "date_end">) {
  return (trip.date_start ?? trip.date_end ?? "").slice(0, 4) || "未定";
}

export function formatTripMonth(trip: Pick<TravelTrip, "date_start" | "date_end">) {
  const value = trip.date_start ?? trip.date_end;
  if (!value) return "日期未定";
  const [year, month] = value.split("-");
  return year && month ? `${year}.${month}` : value;
}

export function formatTripRange(trip: Pick<TravelTrip, "date_start" | "date_end">) {
  if (!trip.date_start && !trip.date_end) return "日期未定";
  if (trip.date_start && !trip.date_end) return trip.date_start.replaceAll("-", ".");
  if (!trip.date_start && trip.date_end) return trip.date_end.replaceAll("-", ".");

  const start = trip.date_start!;
  const end = trip.date_end!;
  const startParts = start.split("-");
  const endParts = end.split("-");
  if (startParts[0] === endParts[0]) {
    return `${startParts[0]}.${startParts[1]}.${startParts[2]} – ${endParts[1]}.${endParts[2]}`;
  }
  return `${start.replaceAll("-", ".")} – ${end.replaceAll("-", ".")}`;
}

export function getMediaPlatform(url: string) {
  return parseVideoUrl(url)?.platform ?? "外部链接";
}

export function isEmojiPhoto(url: string) {
  return url.startsWith("emoji:");
}

export function getEmojiPhoto(url: string) {
  return url.replace(/^emoji:/, "") || "📷";
}
