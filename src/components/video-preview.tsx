import { ExternalLink, PlayCircle } from "lucide-react";
import { parseVideoUrl } from "@/lib/video-embed";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type VideoPreviewProps = {
  url: string | null | undefined;
  label?: string;
  orientation?: "landscape" | "portrait";
  className?: string;
};

export function VideoPreview({ url, label, orientation = "landscape", className }: VideoPreviewProps) {
  const video = parseVideoUrl(url);
  const frameClassName = orientation === "portrait" ? "aspect-[9/16]" : "aspect-video";
  const compact = orientation === "portrait";

  if (!video) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-[18px] border border-dashed border-line bg-line-2/50 px-4 text-center text-sm font-bold text-slate",
          frameClassName,
          compact ? "text-xs leading-5" : "min-h-32",
          className,
        )}
      >
        {label ? `${label}：` : null}粘贴视频链接后显示预览
      </div>
    );
  }

  if (video.kind === "embed") {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-[18px] border border-line bg-black shadow-sm",
          compact ? frameClassName : "",
          className,
        )}
      >
        <div
          className={cn(
            "pointer-events-none absolute left-3 right-3 top-3 z-10 flex items-center justify-between gap-2 text-xs font-bold",
            compact ? "text-white" : "text-ink-2",
          )}
        >
          <span className={cn("truncate rounded-pill px-3 py-1", compact ? "bg-black/45" : "bg-white/90")}>
            {label ?? video.platform}
          </span>
          <Badge tone={video.platform === "Bilibili" ? "pink" : "blue"}>{video.platform}</Badge>
        </div>
        <div className={cn(frameClassName, compact ? "h-full" : "")}>
          <iframe
            title={`${label ?? video.platform} video`}
            src={video.embedUrl}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  return (
    <Card className={cn("border-mint-line bg-mint-soft/50", frameClassName, className)}>
      <CardContent className="flex h-full flex-col items-center justify-center p-4 text-center">
        <div className="mb-3 flex items-center justify-center gap-2 text-mint-deep">
          <PlayCircle className="h-5 w-5" />
          <span className="text-sm font-extrabold">{label ?? video.platform}</span>
        </div>
        <p className={cn("mb-4 text-sm leading-6 text-ink-2", compact ? "line-clamp-4 text-xs leading-5" : "")}>
          {video.reason}
        </p>
        <a
          href={video.originalUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-pill bg-white px-4 py-2 text-sm font-extrabold text-mint-deep shadow-sm hover:bg-mint-soft"
        >
          新标签打开
          <ExternalLink className="h-4 w-4" />
        </a>
      </CardContent>
    </Card>
  );
}
