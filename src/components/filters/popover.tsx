"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The open/closed behaviour shared by the two dropdown filters.
 *
 * It used to close only on an outside pointer-down, which left a keyboard user
 * with no way out of an open panel at all. Escape now closes it and returns
 * focus to the button that opened it, which is what a `<dialog>` or a native
 * `<select>` would do.
 */
export function usePopover() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return { open, setOpen, containerRef, triggerRef };
}

/**
 * The floating panel itself.
 *
 * A fixed 16rem box anchored to the button's left edge overflowed the viewport
 * whenever the button sat in the right half of a narrow screen, which pushed the
 * whole page into a horizontal scroll. Below `sm` the panel is therefore pinned
 * to the viewport's own margins instead of the button's edge; from `sm` up,
 * where there is room, it goes back to being a normal dropdown.
 */
export function PopoverPanel({
  id,
  label,
  children,
}: {
  id: string;
  /** Names the group for a screen reader, since the panel has no visible title. */
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      id={id}
      role="group"
      aria-label={label}
      className="fixed inset-x-4 z-30 mt-1 max-h-80 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-1 shadow-lg sm:absolute sm:inset-x-auto sm:left-0 sm:w-64 dark:border-zinc-700 dark:bg-zinc-900"
    >
      {children}
    </div>
  );
}

/** The shared look of every control in the bar: same height, same radius, and
 *  the same sky tint once it is doing something. */
export function triggerClass(active: boolean): string {
  return `flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm transition-colors ${
    active
      ? "border-sky-500 bg-sky-50 text-sky-900 dark:border-sky-500 dark:bg-sky-950/50 dark:text-sky-100"
      : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
  }`;
}
