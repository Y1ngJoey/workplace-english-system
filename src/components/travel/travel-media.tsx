"use client";

import { ChangeEvent, useMemo, useState } from "react";
import { Copy, ImagePlus, Plus, Trash2, X } from "lucide-react";
import { EditableText } from "@/components/editable-text";
import { VideoPreview } from "@/components/video-preview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/toast-provider";
import { getEmojiPhoto, getMediaPlatform, isEmojiPhoto } from "@/lib/travel";
import type { TravelPlaceMedia } from "@/lib/types";
import type { TravelTextSlot } from "@/lib/travel";

type TravelMediaProps = {
  placeName: string;
  photos: TravelPlaceMedia[];
  videos: TravelPlaceMedia[];
  texts: Record<TravelTextSlot, string>;
  onSaveText: (slot: TravelTextSlot, content: string) => Promise<void>;
  onAddVideo: (url: string) => Promise<void>;
  onAddPhotos: (files: FileList) => Promise<void>;
  onDeleteMedia: (mediaId: string) => Promise<void>;
};

function Dots({ count }: { count: number }) {
  if (count <= 1) return null;
  return (
    <div className="mt-2 flex justify-center gap-1.5">
      {Array.from({ length: count }).map((_, index) => (
        <span key={index} className="h-1.5 w-1.5 rounded-full bg-slate/55 first:bg-pink-deep" />
      ))}
    </div>
  );
}

function PhotoTile({
  item,
  index,
  onOpen,
  onDelete,
}: {
  item: TravelPlaceMedia;
  index: number;
  onOpen: (index: number) => void;
  onDelete: (id: string) => Promise<void>;
}) {
  const emoji = isEmojiPhoto(item.url) ? getEmojiPhoto(item.url) : null;
  return (
    <div className="group relative h-full min-w-full snap-center overflow-hidden rounded-[11px] border border-line bg-line-2">
      <button type="button" className="h-full w-full" onClick={() => onOpen(index)} aria-label="打开照片灯箱">
        {emoji ? (
          <span className="grid h-full w-full place-items-center bg-gradient-to-br from-[#FAEDE2] to-mint-soft text-6xl">
            {emoji}
          </span>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.url} alt="" className="h-full w-full object-cover" />
        )}
      </button>
      <button
        type="button"
        className="absolute right-2 top-2 hidden h-8 w-8 place-items-center rounded-full bg-white/92 text-[#B75B4F] shadow-sm group-hover:grid"
        onClick={() => onDelete(item.id)}
        aria-label="删除照片"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function PhotoStrip({
  photos,
  placeName,
  label,
  single,
  onSaveLabel,
  onDeleteMedia,
}: {
  photos: TravelPlaceMedia[];
  placeName: string;
  label: string;
  single: boolean;
  onSaveLabel: (value: string) => Promise<void>;
  onDeleteMedia: (mediaId: string) => Promise<void>;
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const openPhoto = lightboxIndex !== null ? photos[lightboxIndex] : null;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between px-1 text-[11px] font-extrabold text-slate">
        <EditableText
          aria-label="照片区标题"
          value={label}
          onSave={onSaveLabel}
          inputClassName="h-7 rounded-pill px-2 text-[11px] font-extrabold text-slate"
        />
        <span>{photos.length}</span>
      </div>
      <div className={`flex snap-x snap-mandatory overflow-x-auto rounded-[11px] bg-line-2 ${single ? "aspect-[16/10] max-h-[208px]" : "aspect-[4/3]"}`}>
        {photos.map((photo, index) => (
          <PhotoTile key={photo.id} item={photo} index={index} onOpen={setLightboxIndex} onDelete={onDeleteMedia} />
        ))}
      </div>
      <Dots count={photos.length} />

      {openPhoto ? (
        <div
          className="fixed inset-0 z-[70] flex flex-col bg-ink/90 p-4 text-white"
          onClick={() => setLightboxIndex(null)}
          role="dialog"
          aria-modal="true"
        >
          <div className="mx-auto mb-4 flex w-full max-w-6xl items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-display text-xl font-extrabold">{placeName}</p>
              <p className="text-xs font-bold text-white/70">
                {(lightboxIndex ?? 0) + 1} / {photos.length}
              </p>
            </div>
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-full bg-white/12 hover:bg-white/20"
              onClick={() => setLightboxIndex(null)}
              aria-label="关闭照片"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 snap-x snap-mandatory overflow-x-auto rounded-[24px]">
            {photos.map((photo) => {
              const emoji = isEmojiPhoto(photo.url) ? getEmojiPhoto(photo.url) : null;
              return (
                <div key={photo.id} className="grid min-w-full snap-center place-items-center" onClick={(event) => event.stopPropagation()}>
                  {emoji ? (
                    <span className="grid h-full max-h-[78vh] w-full place-items-center rounded-[24px] bg-gradient-to-br from-[#FAEDE2] to-mint-soft text-8xl">
                      {emoji}
                    </span>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo.url} alt="" className="max-h-[78vh] max-w-full rounded-[24px] object-contain" />
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-center text-xs font-bold text-white/55">左右滑动看下一张</p>
        </div>
      ) : null}
    </div>
  );
}

function VideoStrip({
  videos,
  label,
  single,
  onSaveLabel,
  onDeleteMedia,
}: {
  videos: TravelPlaceMedia[];
  label: string;
  single: boolean;
  onSaveLabel: (value: string) => Promise<void>;
  onDeleteMedia: (mediaId: string) => Promise<void>;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between px-1 text-[11px] font-extrabold text-slate">
        <EditableText
          aria-label="视频区标题"
          value={label}
          onSave={onSaveLabel}
          inputClassName="h-7 rounded-pill px-2 text-[11px] font-extrabold text-slate"
        />
        <span>{videos.length}</span>
      </div>
      <div className={`flex snap-x snap-mandatory overflow-x-auto rounded-[11px] bg-line-2 ${single ? "aspect-[16/10] max-h-[208px]" : "aspect-[4/3]"}`}>
        {videos.map((video) => (
          <div key={video.id} className="group relative min-w-full snap-center overflow-hidden rounded-[11px]">
            <VideoPreview url={video.url} label={video.platform ?? "视频"} orientation="landscape" showLabel className="h-full rounded-[11px]" />
            <button
              type="button"
              className="absolute right-2 top-12 hidden h-8 w-8 place-items-center rounded-full bg-white/92 text-[#B75B4F] shadow-sm group-hover:grid"
              onClick={() => onDeleteMedia(video.id)}
              aria-label="删除视频"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <Dots count={videos.length} />
    </div>
  );
}

export function TravelMedia({
  placeName,
  photos,
  videos,
  texts,
  onSaveText,
  onAddVideo,
  onAddPhotos,
  onDeleteMedia,
}: TravelMediaProps) {
  const { toast } = useToast();
  const [videoDraft, setVideoDraft] = useState("");
  const [savingVideo, setSavingVideo] = useState(false);
  const [uploading, setUploading] = useState(false);
  const hasPhotos = photos.length > 0;
  const hasVideos = videos.length > 0;
  const singleMedia = !(hasPhotos && hasVideos);

  const layoutClassName = useMemo(() => {
    if (hasPhotos && hasVideos) return "grid gap-3 sm:grid-cols-2";
    return "grid gap-3";
  }, [hasPhotos, hasVideos]);

  async function addVideo() {
    const url = videoDraft.trim();
    if (!url) return;
    setSavingVideo(true);
    await onAddVideo(url);
    setVideoDraft("");
    setSavingVideo(false);
  }

  async function uploadPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files?.length) return;
    setUploading(true);
    await onAddPhotos(files);
    event.target.value = "";
    setUploading(false);
  }

  async function copyVideoUrl() {
    const url = videoDraft.trim();
    if (!url) return;
    await navigator.clipboard.writeText(url);
    toast({ title: "视频网址已复制", tone: "success" });
  }

  return (
    <div className="space-y-3">
      {hasPhotos || hasVideos ? (
        <div className={layoutClassName}>
          {hasPhotos ? (
            <PhotoStrip
              photos={photos}
              placeName={placeName}
              label={texts.travel_media_photo_label}
              single={singleMedia}
              onSaveLabel={(value) => onSaveText("travel_media_photo_label", value)}
              onDeleteMedia={onDeleteMedia}
            />
          ) : null}
          {hasVideos ? (
            <VideoStrip
              videos={videos}
              label={texts.travel_media_video_label}
              single={singleMedia}
              onSaveLabel={(value) => onSaveText("travel_media_video_label", value)}
              onDeleteMedia={onDeleteMedia}
            />
          ) : null}
        </div>
      ) : (
        <div className="grid aspect-[16/10] max-h-[208px] place-items-center rounded-[11px] border border-dashed border-line bg-line-2/50 text-center text-xs font-extrabold text-slate">
          <EditableText
            aria-label="媒体空状态"
            value={texts.travel_media_empty}
            onSave={(value) => onSaveText("travel_media_empty", value)}
            inputClassName="text-center text-xs font-extrabold text-slate"
          />
        </div>
      )}

      <details className="border-t border-line/80 pt-2">
        <summary className="cursor-pointer list-none rounded-pill px-2 py-1 text-[11px] font-extrabold text-mint-deep hover:bg-mint-soft">
          {texts.travel_media_add_photo} / 视频链接
        </summary>
        <div className="mt-2 grid gap-2">
          <label className="inline-flex min-h-8 cursor-pointer items-center justify-center gap-2 rounded-pill border border-mint-line bg-mint-soft px-3 text-[11px] font-extrabold text-mint-deep hover:bg-white">
            <ImagePlus className="h-3.5 w-3.5" />
            {uploading ? texts.travel_media_uploading : texts.travel_media_add_photo}
            <input className="sr-only" type="file" accept="image/*" multiple onChange={uploadPhotos} disabled={uploading} />
          </label>
          <div className="flex gap-2">
            <Input
              value={videoDraft}
              onChange={(event) => setVideoDraft(event.target.value)}
              placeholder={texts.travel_media_video_placeholder}
              className="h-8 rounded-pill px-3 text-[11px]"
            />
            <Button variant="softPink" size="icon" className="h-8 w-8" onClick={copyVideoUrl} disabled={!videoDraft.trim()} aria-label="复制视频网址">
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button variant="pink" size="icon" className="h-8 w-8" onClick={addVideo} disabled={!videoDraft.trim() || savingVideo} aria-label="新增视频">
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
          {videoDraft.trim() ? (
            <p className="px-2 text-[11px] font-bold text-slate">
              {texts.travel_media_detected}
              {getMediaPlatform(videoDraft)}
            </p>
          ) : null}
        </div>
      </details>
    </div>
  );
}
