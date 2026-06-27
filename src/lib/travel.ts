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
