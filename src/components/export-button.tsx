"use client";

import { useState } from "react";

import { formatNumber } from "@/lib/devices/format";

/**
 * "Export Excel", with the three states a download actually has.
 *
 * Building the workbook means re-running the whole filtered query unpaginated
 * and writing an xlsx, which takes a few seconds — and a plain link gives no
 * sign that anything is happening, so the button gets clicked again, and again.
 *
 * The anchor keeps its real `href`: right-click "save link as", middle-click and
 * an un-hydrated page all still work exactly as before. Only a plain left-click
 * is intercepted, and only to fetch the same URL so the button can report
 * progress and say so when the server refuses.
 */
type State = "idle" | "loading" | "error" | "throttled";

/** `attachment; filename="starcat-devices-2026-08-14.xlsx"` → the filename. */
function filenameFrom(header: string | null): string | null {
  const match = header?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  return match ? decodeURIComponent(match[1]) : null;
}

export function ExportButton({
  href,
  /** Row count behind the link, so the button says what it will produce. */
  total,
}: {
  href: string;
  total: number;
}) {
  const [state, setState] = useState<State>("idle");

  const download = async (event: React.MouseEvent<HTMLAnchorElement>) => {
    // Let the browser handle anything that is not a plain left-click.
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    event.preventDefault();
    setState("loading");

    try {
      const response = await fetch(href);
      // The server caps how often one caller may ask for a full export; that is
      // a "wait a moment", not a failure, and reads differently to the user.
      if (response.status === 429) {
        setState("throttled");
        return;
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download =
        filenameFrom(response.headers.get("Content-Disposition")) ??
        "starcat-devices.xlsx";
      link.click();
      URL.revokeObjectURL(objectUrl);

      setState("idle");
    } catch {
      setState("error");
    }
  };

  const loading = state === "loading";

  return (
    <div className="flex flex-col items-end gap-1">
      <a
        href={href}
        onClick={download}
        aria-busy={loading}
        aria-disabled={loading}
        className={`inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-medium text-white transition-colors ${
          loading
            ? "cursor-progress bg-emerald-700"
            : "bg-emerald-600 hover:bg-emerald-700"
        }`}
      >
        <span aria-hidden className={loading ? "animate-pulse" : ""}>
          ⤓
        </span>
        {loading ? "กำลังสร้างไฟล์…" : "Export Excel"}
        {loading ? null : (
          <span className="text-emerald-100">({formatNumber(total)})</span>
        )}
      </a>

      {/* The route already logs the real cause server-side; the reader only
          needs to know what happened and whether waiting will help. */}
      {state === "error" ? (
        <p role="status" className="text-xs text-red-600 dark:text-red-400">
          สร้างไฟล์ไม่สำเร็จ — ลองใหม่อีกครั้ง
        </p>
      ) : null}
      {state === "throttled" ? (
        <p role="status" className="text-xs text-amber-700 dark:text-amber-400">
          ขอไฟล์ถี่เกินไป — รอสักครู่แล้วลองใหม่
        </p>
      ) : null}
    </div>
  );
}
