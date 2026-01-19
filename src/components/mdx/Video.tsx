import type React from "react";

interface VideoProps {
  url: string;
  title?: string;
}

// Extract video ID from YouTube or Vimeo URLs
function extractVideoId(
  url: string,
): { id: string; platform: "youtube" | "vimeo" } | null {
  // YouTube patterns
  const youtubeRegex =
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const youtubeMatch = youtubeRegex.exec(url);
  if (youtubeMatch) {
    return { id: youtubeMatch[1]!, platform: "youtube" };
  }

  // Vimeo patterns
  const vimeoRegex = /(?:vimeo\.com\/)(?:.*\/)?(\d+)/;
  const vimeoMatch = vimeoRegex.exec(url);
  if (vimeoMatch) {
    return { id: vimeoMatch[1]!, platform: "vimeo" };
  }

  return null;
}

export function Video({ url, title }: VideoProps) {
  const videoInfo = extractVideoId(url);

  if (!videoInfo) {
    return (
      <div className="my-8 rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm text-red-800">
          Invalid video URL. Please provide a valid YouTube or Vimeo URL.
        </p>
      </div>
    );
  }

  const { id, platform } = videoInfo;

  if (platform === "youtube") {
    return (
      <div className="my-8">
        <div className="relative aspect-video w-full overflow-hidden rounded-lg">
          <iframe
            src={`https://www.youtube.com/embed/${id}`}
            title={title || "Video"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        </div>
      </div>
    );
  }

  // Vimeo
  return (
    <div className="my-8">
      <div className="relative aspect-video w-full overflow-hidden rounded-lg">
        <iframe
          src={`https://player.vimeo.com/video/${id}`}
          title={title || "Video"}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      </div>
    </div>
  );
}
