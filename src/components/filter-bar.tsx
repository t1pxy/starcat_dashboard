"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import type { Facets, FacetValue } from "@/lib/devices/types";

/** Filter state lives entirely in the URL, so any view is linkable and the
 *  Excel export can be a plain link carrying the same query string. */
function useQueryUpdater() {
  const router = useRouter();
  // The same bar serves the tables and the charts; changing a filter must keep
  // you on the view you are reading rather than bouncing you to the other one.
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const update = (
    patch: Record<string, string | string[] | null>,
    { replace = false }: { replace?: boolean } = {},
  ) => {
    const next = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(patch)) {
      next.delete(key);
      if (value === null) continue;
      for (const entry of Array.isArray(value) ? value : [value]) {
        if (entry) next.append(key, entry);
      }
    }
    // Any filter change invalidates the current page number.
    next.delete("page");

    const queryString = next.toString();
    startTransition(() => {
      const url = queryString ? `${pathname}?${queryString}` : pathname;
      if (replace) router.replace(url, { scroll: false });
      else router.push(url, { scroll: false });
    });
  };

  return { update, searchParams, isPending };
}

function MultiSelect({
  label,
  english,
  paramKey,
  options,
}: {
  label: string;
  english: string;
  paramKey: string;
  options: FacetValue[];
}) {
  const { update, searchParams } = useQueryUpdater();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selected = searchParams.getAll(paramKey);

  // Close on outside click so several dropdowns can't stack open at once.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const toggle = (value: string) => {
    const next = selected.includes(value)
      ? selected.filter((entry) => entry !== value)
      : [...selected, value];
    update({ [paramKey]: next.length ? next : null });
  };

  if (options.length === 0) return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className={`flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors ${
          selected.length
            ? "border-sky-500 bg-sky-50 text-sky-900 dark:border-sky-500 dark:bg-sky-950/50 dark:text-sky-100"
            : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
        }`}
      >
        <span>{label}</span>
        {selected.length > 0 && (
          <span className="rounded bg-sky-600 px-1.5 text-xs font-medium text-white">
            {selected.length}
          </span>
        )}
        <span className="text-zinc-400" aria-hidden>
          ▾
        </span>
      </button>

      {open && (
        <div className="absolute z-20 mt-1 max-h-80 w-64 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <div className="px-2 py-1.5 text-xs text-zinc-400 dark:text-zinc-500">
            {english}
          </div>
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => update({ [paramKey]: null })}
              className="mb-1 w-full rounded px-2 py-1 text-left text-xs text-sky-700 hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-950/50"
            >
              ล้างตัวเลือกนี้
            </button>
          )}
          {options.map((option) => (
            <label
              key={option.value}
              className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              <input
                type="checkbox"
                checked={selected.includes(option.value)}
                onChange={() => toggle(option.value)}
                className="size-4 accent-sky-600"
              />
              <span
                className="flex-1 truncate text-zinc-700 dark:text-zinc-300"
                title={option.value}
              >
                {option.value}
              </span>
              <span className="text-xs tabular-nums text-zinc-400">
                {option.count}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function SearchBox() {
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
    <div className="relative min-w-56 flex-1">
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="ค้นหา ชื่อเครื่อง / ซีเรียล / ผู้ถือครอง / IP…"
        aria-label="ค้นหาอุปกรณ์"
        className="h-9 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-sky-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
      />
    </div>
  );
}

function Toggle({
  label,
  paramKey,
  activeValue,
}: {
  label: string;
  paramKey: string;
  activeValue: string;
}) {
  const { update, searchParams } = useQueryUpdater();
  const active = searchParams.get(paramKey) === activeValue;

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={() => update({ [paramKey]: active ? null : activeValue })}
      className={`h-9 rounded-lg border px-3 text-sm transition-colors ${
        active
          ? "border-sky-500 bg-sky-50 text-sky-900 dark:border-sky-500 dark:bg-sky-950/50 dark:text-sky-100"
          : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
      }`}
    >
      {label}
    </button>
  );
}

/**
 * Which slice of the asset register the whole dashboard is reading.
 *
 * Given its own control, separated from the filters, because it is not a
 * filter: it decides what the page is *about*. Monitoring means computers and
 * laptops — the things that have an OS to patch and an agent to answer — so
 * that is the default, and widening to the full register is a deliberate act.
 */
function ScopeSwitch() {
  const { update, searchParams } = useQueryUpdater();
  const all = searchParams.get("scope") === "all";

  const options = [
    { value: null, label: "คอม & โน้ตบุ๊ก", english: "Computers", on: !all },
    { value: "all", label: "อุปกรณ์ทั้งหมด", english: "All assets", on: all },
  ];

  return (
    <div
      role="group"
      aria-label="ขอบเขตข้อมูล"
      className="flex h-9 items-center rounded-lg border border-zinc-300 bg-white p-0.5 dark:border-zinc-700 dark:bg-zinc-900"
    >
      {options.map((option) => (
        <button
          key={option.english}
          type="button"
          aria-pressed={option.on}
          onClick={() => update({ scope: option.value })}
          className={`h-full rounded-md px-2.5 text-sm transition-colors ${
            option.on
              ? "bg-zinc-900 font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function FilterBar({
  facets,
  activeCount,
}: {
  facets: Facets;
  activeCount: number;
}) {
  const { update, searchParams, isPending } = useQueryUpdater();

  return (
    <div
      className={`flex flex-wrap items-center gap-2 transition-opacity ${
        isPending ? "opacity-60" : ""
      }`}
    >
      <ScopeSwitch />

      <SearchBox />

      <MultiSelect label="ประเภท" english="Type" paramKey="deviceType" options={facets.deviceType} />
      <MultiSelect label="หมวดหมู่" english="Category" paramKey="category" options={facets.category} />
      <MultiSelect label="ยี่ห้อ" english="Brand" paramKey="brand" options={facets.brand} />
      <MultiSelect label="รุ่น" english="Model" paramKey="model" options={facets.model} />
      <MultiSelect label="หน่วยงาน" english="Department" paramKey="department" options={facets.department} />
      <MultiSelect label="สถานที่" english="Location" paramKey="location" options={facets.location} />
      <MultiSelect label="Windows" english="Windows Version" paramKey="windowsVersion" options={facets.windowsVersion} />

      <Toggle label="ออนไลน์" paramKey="online" activeValue="true" />
      <Toggle label="Windows ไม่ล่าสุด" paramKey="outdated" activeValue="1" />
      <Toggle label="ไม่ติดต่อ 30 วัน+" paramKey="stale" activeValue="30" />
      <Toggle label="ประกันใกล้หมด" paramKey="warrantyWithin" activeValue="90" />
      <Toggle label="อายุ 5 ปีขึ้นไป" paramKey="minAge" activeValue="5" />

      {activeCount > 0 && (
        <button
          type="button"
          onClick={() =>
            update(
              Object.fromEntries(
                [...new Set(searchParams.keys())].map((key) => [key, null]),
              ),
            )
          }
          className="h-9 rounded-lg px-3 text-sm text-zinc-600 underline-offset-2 hover:underline dark:text-zinc-400"
        >
          ล้างตัวกรอง ({activeCount})
        </button>
      )}
    </div>
  );
}
