import { TONE_BORDER, type Tone } from "./tone";

/**
 * The dashboard's one card surface.
 *
 * The string `rounded-xl border border-zinc-200 bg-white dark:…` was written out
 * in eight components, each with slightly different padding, which is how a page
 * ends up looking hand-assembled. One component now owns the surface; callers
 * own what goes inside it.
 *
 * `tone` colours the border only — the background stays plain. A tinted surface
 * is reserved for the KPI tiles, where the tint *is* the signal; a work queue
 * only needs its edge to say which kind of work it holds.
 */
export function Card({
  tone = "neutral",
  className = "",
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-xl border bg-white dark:bg-zinc-900 ${TONE_BORDER[tone]} ${className}`}
    >
      {children}
    </section>
  );
}

/**
 * The band across the top of a card: heading on the left, a count or a legend
 * on the right, wrapping onto two lines rather than squeezing on narrow screens.
 */
export function CardHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3">
      {children}
    </div>
  );
}
