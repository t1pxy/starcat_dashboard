/**
 * The one tone vocabulary the whole UI speaks.
 *
 * Before this there were five: `TILE_TONE` on the wall, `TONE_CLASSES` +
 * `VALUE_CLASSES` on the summary tiles, `TONE` on the work queues and
 * `PATCH_TONE` on the Windows cell — five sets of class strings describing the
 * same four states, which is why an amber queue header and an amber tile were
 * never quite the same amber.
 *
 * Tone is reserved for *state* and never used to tell two series apart, matching
 * the rule the chart palette in `globals.css` already follows: green is fine,
 * amber is work to schedule, red is work already overdue, neutral is a number
 * that is merely a number.
 *
 * These are Tailwind class strings rather than the `--status-*` CSS variables
 * because they carry border/background/text together with their dark-mode
 * pairs; the variables stay where they are, filling chart geometry.
 */
export type Tone = "neutral" | "good" | "warning" | "critical";

/** Filled card surface — border and background together. */
export const TONE_SURFACE: Record<Tone, string> = {
  neutral: "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900",
  good: "border-emerald-200 bg-emerald-50/60 dark:border-emerald-900/60 dark:bg-emerald-950/30",
  warning:
    "border-amber-200 bg-amber-50/60 dark:border-amber-900/60 dark:bg-amber-950/30",
  critical: "border-red-200 bg-red-50/60 dark:border-red-900/60 dark:bg-red-950/30",
};

/** Border only, for a card that keeps the plain surface but carries a state. */
export const TONE_BORDER: Record<Tone, string> = {
  neutral: "border-zinc-200 dark:border-zinc-800",
  good: "border-emerald-200 dark:border-emerald-900/60",
  warning: "border-amber-200 dark:border-amber-900/60",
  critical: "border-red-200 dark:border-red-900/60",
};

/** Emphasised text — a KPI number, a queue count, a patch verdict. */
export const TONE_TEXT: Record<Tone, string> = {
  neutral: "text-zinc-900 dark:text-zinc-50",
  good: "text-emerald-700 dark:text-emerald-300",
  warning: "text-amber-700 dark:text-amber-300",
  critical: "text-red-700 dark:text-red-300",
};

/** Table header tint, so a queue's heading row carries the queue's state. */
export const TONE_TABLE_HEAD: Record<Tone, string> = {
  neutral: "bg-zinc-50 dark:bg-zinc-950/40",
  good: "bg-emerald-50/60 dark:bg-emerald-950/20",
  warning: "bg-amber-50/60 dark:bg-amber-950/20",
  critical: "bg-red-50/60 dark:bg-red-950/20",
};

/**
 * The wall display commits to a dark surface regardless of the system theme,
 * so its tones are a separate, single-mode set rather than a light/dark pair.
 */
export const TONE_ON_DARK: Record<Tone, string> = {
  neutral: "border-zinc-800 bg-zinc-900/60 text-zinc-100",
  good: "border-emerald-800/60 bg-emerald-950/40 text-emerald-300",
  warning: "border-amber-800/60 bg-amber-950/40 text-amber-300",
  critical: "border-red-800/60 bg-red-950/40 text-red-300",
};

/**
 * Secondary text that still has to be readable.
 *
 * `zinc-400` on white measures 2.6:1, well under the 4.5:1 WCAG AA floor for
 * body text — and it was carrying every English sub-label in the dashboard, at
 * 10–12px. One step darker in light mode (and one step lighter in dark) clears
 * AA on both surfaces while staying visibly secondary.
 */
export const MUTED_TEXT = "text-zinc-500 dark:text-zinc-400";

/** For a placeholder standing in for absent data — quieter than real text. */
export const PLACEHOLDER_TEXT = "text-zinc-400 dark:text-zinc-500";
