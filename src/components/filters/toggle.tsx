"use client";

import { triggerClass } from "./popover";
import { useQueryUpdater } from "./use-query-updater";

/** A filter that is either on or off, and carries a fixed value when on. */
export function Toggle({
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
      className={triggerClass(active)}
    >
      {label}
    </button>
  );
}
