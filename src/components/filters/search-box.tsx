"use client";

import { useEffect, useState } from "react";

import { useQueryUpdater } from "./use-query-updater";

export function SearchBox() {
  const { update, searchParams } = useQueryUpdater();
  const urlValue = searchParams.get("q") ?? "";
  const [value, setValue] = useState(urlValue);
  const [syncedValue, setSyncedValue] = useState(urlValue);

  // Keep in step when the query changes from elsewhere (e.g. "ล้างตัวกรอง").
  // Adjusting during render rather than in an effect — React re-renders before
  // committing, so the box never paints a stale value.
  if (urlValue !== syncedValue) {
    setSyncedValue(urlValue);
    setValue(urlValue);
  }

  // Debounced so typing doesn't fire a query per keystroke.
  useEffect(() => {
    if (value === urlValue) return;
    const timer = setTimeout(() => update({ q: value || null }, { replace: true }), 350);
    return () => clearTimeout(timer);
    // `update` is recreated each render; depending on it would reset the timer
    // on every render and the debounce would never fire.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, urlValue]);

  return (
    <div className="relative min-w-0 flex-1 sm:min-w-56">
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="ค้นหา ชื่อเครื่อง / ซีเรียล / ผู้ถือครอง / IP…"
        aria-label="ค้นหาอุปกรณ์"
        className="h-9 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-500 focus:border-sky-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-400"
      />
    </div>
  );
}
