"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";

import { formatDateTime } from "@/lib/devices/format";

/**
 * "Is what I am looking at still true?" — the first question anyone asks of a
 * monitoring screen, and the one this dashboard could not answer.
 *
 * Every page here is a server render of a live MSSQL query, which means it was
 * accurate at the moment it was requested and never again. A screen left open on
 * someone's second monitor could sit there all afternoon showing the morning's
 * fleet, with nothing on it admitting so.
 *
 * So: state when the data was read, keep saying how long ago that was, and
 * re-read it on a timer.
 */

/** How often an open screen re-reads the database. */
const REFRESH_MS = 5 * 60 * 1000;

/** How often the "N นาทีที่แล้ว" label is recomputed. Cheap, and it keeps the
 *  age honest between refreshes without waiting five minutes to move. */
const TICK_MS = 15_000;

/** Past this the reading is treated as suspect — the timer should have fired by
 *  now, so either the tab was asleep or a refresh is failing. */
const SUSPECT_MS = REFRESH_MS * 2;

/**
 * True once the browser has taken over, false while rendering on the server.
 *
 * The elapsed-time label cannot be server-rendered — it would be baked in as
 * "เมื่อสักครู่" and be wrong by the time it reached the screen — so it is held
 * back until hydration. Read through `useSyncExternalStore` rather than an
 * effect that sets state, which is the form React sanctions for exactly this:
 * a value whose server and client snapshots legitimately differ.
 */
const NEVER_CHANGES = () => () => {};

function useHydrated(): boolean {
  return useSyncExternalStore(
    NEVER_CHANGES,
    () => true,
    () => false,
  );
}

function describeAge(ms: number): string {
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "เมื่อสักครู่";
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
  return `${Math.floor(minutes / 60)} ชั่วโมงที่แล้ว`;
}

export function LiveRefresh({
  fetchedAt,
  /** Set on the wall display, which is read from across a room. */
  size = "compact",
}: {
  /** ISO timestamp of the render that produced what is on screen. */
  fetchedAt: string;
  size?: "compact" | "large";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [now, setNow] = useState(() => Date.now());

  const hydrated = useHydrated();

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const refresh = () => startTransition(() => router.refresh());

    // Re-reading the fleet is a ten-way join over the Starcat schema, so a tab
    // nobody is looking at does not get to keep asking for it. It catches up the
    // moment somebody looks back at it.
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, REFRESH_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - Date.parse(fetchedAt) >= REFRESH_MS) refresh();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
    // Re-armed on every successful refresh, so the countdown restarts from the
    // reading actually on screen rather than from when the page first opened.
  }, [router, fetchedAt]);

  const age = now - Date.parse(fetchedAt);
  const suspect = hydrated && age >= SUSPECT_MS;

  const large = size === "large";

  return (
    <div
      className={`flex items-center gap-2 ${large ? "text-base" : "text-xs"}`}
    >
      <span
        aria-hidden
        className={`rounded-full ${large ? "size-2.5" : "size-1.5"} ${
          isPending
            ? "animate-pulse bg-sky-500"
            : suspect
              ? "bg-amber-500"
              : "bg-emerald-500"
        }`}
      />
      <span className="opacity-80">
        ข้อมูล ณ {formatDateTime(fetchedAt)}
        {hydrated ? (
          <span className="ml-1.5 opacity-70">
            ({isPending ? "กำลังอัพเดท…" : describeAge(age)})
          </span>
        ) : null}
      </span>
      <button
        type="button"
        onClick={() => startTransition(() => router.refresh())}
        aria-label="ดึงข้อมูลใหม่ตอนนี้"
        className={`rounded-md border border-current/25 px-2 py-0.5 opacity-70 transition-opacity hover:opacity-100 ${
          large ? "text-sm" : "text-[11px]"
        }`}
      >
        รีเฟรช
      </button>
    </div>
  );
}
