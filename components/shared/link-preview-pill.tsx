"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Link as LinkIcon, ArrowSquareOut } from "@phosphor-icons/react";

type Preview = { title: string; favicon: string | null };

// ponytail: in-memory cache per session, avoids re-fetching the same evidence link twice
const previewCache = new Map<string, Preview | null>();

export function LinkPreviewPill({ url }: { url: string }) {
  const [preview, setPreview] = useState<Preview | null>(() => previewCache.get(url) ?? null);
  const [loading, setLoading] = useState(!previewCache.has(url));

  useEffect(() => {
    if (previewCache.has(url)) {
      setPreview(previewCache.get(url) ?? null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    fetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled) return;
        const result: Preview | null = json?.title ? { title: json.title, favicon: json.favicon ?? null } : null;
        previewCache.set(url, result);
        setPreview(result);
      })
      .catch(() => {
        if (!cancelled) {
          previewCache.set(url, null);
          setPreview(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  if (loading) {
    return (
      <span className="inline-flex h-8 animate-pulse items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 text-xs text-gray-400">
        <LinkIcon size={13} weight="bold" />
        Loading link...
      </span>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-8 max-w-full items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
    >
      {preview?.favicon ? (
        <Image src={preview.favicon} alt="" width={14} height={14} unoptimized className="shrink-0 rounded-sm" />
      ) : (
        <LinkIcon size={13} weight="bold" className="shrink-0" />
      )}
      <span className="truncate">{preview?.title || url}</span>
      <ArrowSquareOut size={11} weight="bold" className="shrink-0 opacity-70" />
    </a>
  );
}
