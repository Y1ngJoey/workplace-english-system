import { ExternalLink, PlayCircle } from "lucide-react";
import { parseVideoUrl } from "@/lib/video-embed";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function VideoPreview({ url, label }: { url: string | null | undefined; label?: string }) {
  const video = parseVideoUrl(url);

  if (!video) {
    return (
      <div className="flex min-h-32 items-center justify-center rounded-[18px] border border-dashed border-line bg-line-2/50 text-sm font-bold text-slate">
        {label ? `${label}：` : null}粘贴视频链接后显示预览
      </div>
    );
  }

  if (video.kind === "embed") {
    return (
      <div className="overflow-hidden rounded-[18px] border border-line bg-black shadow-sm">
        <div className="flex items-center justify-between bg-card px-4 py-2 text-xs font-bold text-ink-2">
          <span>{label ?? video.platform}</span>
          <Badge tone={video.platform === "Bilibili" ? "pink" : "blue"}>{video.platform}</Badge>
        </div>
        <div className="aspect-video">
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
    <Card className="border-mint-line bg-mint-soft/50">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center gap-2 text-mint-deep">
          <PlayCircle className="h-5 w-5" />
          <span className="text-sm font-extrabold">{label ?? video.platform}</span>
        </div>
        <p className="mb-4 text-sm leading-6 text-ink-2">{video.reason}</p>
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
