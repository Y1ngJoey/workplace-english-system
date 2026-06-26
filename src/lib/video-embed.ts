export type VideoEmbed =
  | {
      kind: "embed";
      platform: "YouTube" | "Bilibili";
      embedUrl: string;
      originalUrl: string;
    }
  | {
      kind: "external";
      platform: "小红书" | "外部链接";
      originalUrl: string;
      reason: string;
    };

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return new URL(trimmed);
  } catch {
    try {
      return new URL(`https://${trimmed}`);
    } catch {
      return null;
    }
  }
}

export function parseVideoUrl(value: string | null | undefined): VideoEmbed | null {
  if (!value) return null;
  const url = normalizeUrl(value);
  if (!url) return null;

  const host = url.hostname.replace(/^www\./, "");
  const originalUrl = url.toString();

  if (host === "youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    return id ? { kind: "embed", platform: "YouTube", embedUrl: `https://www.youtube.com/embed/${id}`, originalUrl } : null;
  }

  if (host.includes("youtube.com")) {
    const fromQuery = url.searchParams.get("v");
    const pathParts = url.pathname.split("/").filter(Boolean);
    const fromPath = pathParts[0] === "shorts" || pathParts[0] === "embed" ? pathParts[1] : null;
    const id = fromQuery || fromPath;
    return id ? { kind: "embed", platform: "YouTube", embedUrl: `https://www.youtube.com/embed/${id}`, originalUrl } : null;
  }

  if (host.includes("bilibili.com") || host.includes("b23.tv")) {
    const match = originalUrl.match(/BV[0-9A-Za-z]+/);
    if (match?.[0]) {
      return {
        kind: "embed",
        platform: "Bilibili",
        embedUrl: `https://player.bilibili.com/player.html?bvid=${match[0]}`,
        originalUrl,
      };
    }
  }

  if (host.includes("xiaohongshu.com") || host.includes("xhslink.com")) {
    return {
      kind: "external",
      platform: "小红书",
      originalUrl,
      reason: "小红书暂无稳定官方嵌入播放器，先用外链卡片打开。",
    };
  }

  return {
    kind: "external",
    platform: "外部链接",
    originalUrl,
    reason: "暂未识别为 YouTube 或 B站链接，先作为外部链接保存。",
  };
}
