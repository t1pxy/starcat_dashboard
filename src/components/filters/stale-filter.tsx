"use client";

import { useId, useState } from "react";

import { PopoverPanel, triggerClass, usePopover } from "./popover";
import { useQueryUpdater } from "./use-query-updater";
import {
  clampStaleDays,
  MAX_STALE_DAYS,
  MIN_STALE_DAYS,
} from "@/lib/devices/thresholds";

/**
 * How long a machine has to stay quiet before the page calls it out of contact.
 *
 * This was a fixed "ไม่ติดต่อ 30 วัน+" switch, and thirty days is only ever the
 * right question by accident: chasing this week's no-shows and auditing the ones
 * that have been gone half a year are different jobs. The number is now the
 * reader's to set, and it is a single number for the whole page — the tile, the
 * inactive-devices queue and the contact chart are all cut at whatever is chosen
 * here.
 *
 * Presets cover the spans people actually ask for; the box below them is there
 * because the one span someone needs is always missing from a list of six.
 */
const STALE_PRESETS = [7, 14, 30, 60, 90, 180];

export function StaleFilter({ defaultDays }: { defaultDays: number }) {
  const { update, searchParams } = useQueryUpdater();
  const { open, setOpen, containerRef, triggerRef } = usePopover();
  const panelId = useId();
  const inputId = useId();

  const raw = searchParams.get("stale");
  const active = raw !== null && raw !== "";
  const current = active ? clampStaleDays(Number(raw) || defaultDays) : defaultDays;

  // The box holds a half-typed number, which is not a filter yet. Re-sync it
  // during render when the URL moves under us (a preset, or "ล้างตัวกรอง").
  const [draft, setDraft] = useState(String(current));
  const [syncedDays, setSyncedDays] = useState(current);
  if (current !== syncedDays) {
    setSyncedDays(current);
    setDraft(String(current));
  }

  const apply = (days: number) => {
    update({ stale: String(clampStaleDays(days)) });
    setOpen(false);
  };

  const applyDraft = () => {
    const parsed = Number(draft);
    if (!Number.isFinite(parsed) || parsed < MIN_STALE_DAYS) {
      setDraft(String(current));
      return;
    }
    apply(parsed);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        className={triggerClass(active)}
      >
        <span>{active ? `ไม่ติดต่อ ${current} วัน+` : "ไม่ติดต่อนาน"}</span>
        <span className="text-zinc-500 dark:text-zinc-400" aria-hidden>
          ▾
        </span>
      </button>

      {open && (
        <PopoverPanel id={panelId} label="ไม่ติดต่อเข้ามาตั้งแต่ (วัน)">
          <div className="px-1 pb-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            ไม่ติดต่อเข้ามาตั้งแต่ (วัน)
            <span lang="en" className="ml-1">
              Days since last contact
            </span>
          </div>

          <div className="flex flex-wrap gap-1 px-1">
            {STALE_PRESETS.map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => apply(days)}
                aria-pressed={active && current === days}
                className={`h-8 min-w-11 rounded-md border px-2 text-sm tabular-nums transition-colors ${
                  active && current === days
                    ? "border-sky-500 bg-sky-600 text-white dark:border-sky-500"
                    : "border-zinc-200 text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:text-zinc-300"
                }`}
              >
                {days}
              </button>
            ))}
          </div>

          <div className="mt-2 flex items-center gap-1.5 px-1 pb-1">
            <label htmlFor={inputId} className="sr-only">
              กำหนดจำนวนวันเอง
            </label>
            <input
              id={inputId}
              type="number"
              min={MIN_STALE_DAYS}
              max={MAX_STALE_DAYS}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") applyDraft();
              }}
              className="h-8 w-full rounded-md border border-zinc-300 bg-white px-2 text-sm tabular-nums text-zinc-900 focus:border-sky-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
            <span className="text-xs text-zinc-500 dark:text-zinc-400">วัน</span>
            <button
              type="button"
              onClick={applyDraft}
              className="h-8 shrink-0 rounded-md bg-zinc-900 px-2.5 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              ใช้
            </button>
          </div>

          {active && (
            <button
              type="button"
              onClick={() => {
                update({ stale: null });
                setOpen(false);
              }}
              className="mt-1 w-full rounded px-2 py-1 text-left text-xs text-sky-700 hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-950/50"
            >
              ล้างตัวเลือกนี้ (กลับไปใช้ {defaultDays} วัน)
            </button>
          )}
        </PopoverPanel>
      )}
    </div>
  );
}
