"use client";

import { useId } from "react";

import { PopoverPanel, triggerClass, usePopover } from "./popover";
import { selectedValues, useQueryUpdater } from "./use-query-updater";
import type { FacetValue } from "@/lib/devices/types";

/** One dimension's dropdown — brand, department, Windows version. Options are
 *  counted against the whole scope, so a value never vanishes from its own list
 *  once you select it. */
export function MultiSelect({
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
  const { open, setOpen, containerRef, triggerRef } = usePopover();
  const panelId = useId();
  const selected = selectedValues(searchParams, paramKey);

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
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        className={triggerClass(selected.length > 0)}
      >
        <span>{label}</span>
        {selected.length > 0 && (
          <span className="rounded bg-sky-600 px-1.5 text-xs font-medium text-white">
            {selected.length}
          </span>
        )}
        <span className="text-zinc-500 dark:text-zinc-400" aria-hidden>
          ▾
        </span>
      </button>

      {open && (
        <PopoverPanel id={panelId} label={`${label} — ${english}`}>
          <div
            lang="en"
            className="px-2 py-1.5 text-xs text-zinc-500 dark:text-zinc-400"
          >
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
              <span className="text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                {option.count}
              </span>
            </label>
          ))}
        </PopoverPanel>
      )}
    </div>
  );
}
