"use client";

import { useId, useState } from "react";

import { ActiveFilters } from "./filters/active-filters";
import { MultiSelect } from "./filters/multi-select";
import { triggerClass } from "./filters/popover";
import { ScopeSwitch } from "./filters/scope-switch";
import { SearchBox } from "./filters/search-box";
import { StaleFilter } from "./filters/stale-filter";
import { Toggle } from "./filters/toggle";
import { useQueryUpdater } from "./filters/use-query-updater";
import { DIMENSIONS, DIMENSION_LABELS } from "@/lib/devices/dimensions";
import type { Facets } from "@/lib/devices/types";

/**
 * The filter bar, composed from the controls in `./filters`.
 *
 * It used to be thirteen controls in one flat wrapping row, which on a phone was
 * a wall of buttons filling half the screen before any data appeared. The three
 * things you always reach for — what you are looking at, what you are looking
 * for, and what is currently filtered — stay visible; the ten dimension filters
 * collapse behind a disclosure below `md` and are simply always open above it,
 * where there is room for them.
 */
export function FilterBar({
  facets,
  activeCount,
  defaultStaleDays,
}: {
  facets: Facets;
  activeCount: number;
  /** The silence threshold used when the reader has not set one. Handed down
   *  rather than imported so the client bundle does not pull in the SQL schema
   *  module for the sake of one constant. */
  defaultStaleDays: number;
}) {
  const { isPending } = useQueryUpdater();
  const [open, setOpen] = useState(false);
  const groupId = useId();

  return (
    <div
      aria-busy={isPending}
      className={`space-y-2 transition-opacity ${isPending ? "opacity-60" : ""}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <ScopeSwitch />
        <SearchBox />

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={groupId}
          className={`${triggerClass(activeCount > 0)} md:hidden`}
        >
          ตัวกรอง
          {activeCount > 0 && (
            <span className="rounded bg-sky-600 px-1.5 text-xs font-medium text-white">
              {activeCount}
            </span>
          )}
          <span className="text-zinc-500 dark:text-zinc-400" aria-hidden>
            {open ? "▴" : "▾"}
          </span>
        </button>
      </div>

      <div
        id={groupId}
        className={`${open ? "flex" : "hidden"} flex-wrap items-center gap-2 md:flex`}
      >
        {/* Rendered from the shared dimension list, so a dimension added to the
            query layer turns up here without a second edit. */}
        {DIMENSIONS.map((dimension) => (
          <MultiSelect
            key={dimension}
            label={DIMENSION_LABELS[dimension].th}
            english={DIMENSION_LABELS[dimension].en}
            paramKey={dimension}
            options={facets[dimension]}
          />
        ))}

        <Toggle label="ออนไลน์" paramKey="online" activeValue="true" />
        <Toggle label="Windows ไม่ล่าสุด" paramKey="outdated" activeValue="1" />
        <StaleFilter defaultDays={defaultStaleDays} />
        <Toggle label="ประกันใกล้หมด" paramKey="warrantyWithin" activeValue="90" />
        <Toggle label="อายุ 5 ปีขึ้นไป" paramKey="minAge" activeValue="5" />
      </div>

      <ActiveFilters defaultStaleDays={defaultStaleDays} />
    </div>
  );
}
