"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

type Crumb = { label: string; href?: string; active?: boolean };

function appendWs(href: string, ws: string | null): string {
  if (!ws) return href;
  try {
    const [path, search] = href.split("?");
    const params = new URLSearchParams(search || "");
    if (!params.has("ws")) {
      params.set("ws", ws);
    }
    const query = params.toString();
    return query ? `${path}?${query}` : path;
  } catch {
    return href;
  }
}

export function Breadcrumb({ crumbs, className }: { crumbs: Crumb[]; className?: string }) {
  const searchParams = useSearchParams();
  const ws = searchParams?.get("ws");

  return (
    <nav aria-label="Breadcrumb" className={cn("mb-3 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400", className)}>
      {crumbs.map((crumb, i) => {
        const href = crumb.href ? appendWs(crumb.href, ws) : undefined;
        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-slate-300" aria-hidden>/</span>}
            {href ? (
              <Link href={href} className="text-slate-500 transition hover:text-sky-700">
                {crumb.label}
              </Link>
            ) : (
              <span className="font-bold text-slate-900">{crumb.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
