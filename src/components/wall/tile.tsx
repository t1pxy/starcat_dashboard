import { TONE_ON_DARK, type Tone } from "@/components/ui/tone";

/**
 * One number on the wall display, sized to be read from across the room.
 *
 * Much larger type than the KPI tiles on the tables page, and a single-mode
 * dark surface rather than a light/dark pair — see `TONE_ON_DARK`.
 */
export function Tile({
  label,
  english,
  value,
  caption,
  tone,
}: {
  label: string;
  english: string;
  value: string;
  caption?: string;
  tone: Tone;
}) {
  return (
    <div className={`rounded-2xl border p-5 ${TONE_ON_DARK[tone]}`}>
      <div className="text-base font-medium text-zinc-300">
        {label}
        <span lang="en" className="ml-2 text-sm font-normal text-zinc-500">
          {english}
        </span>
      </div>
      <div className="mt-1.5 text-5xl font-semibold tabular-nums tracking-tight">
        {value}
      </div>
      {caption ? (
        <div className="mt-1.5 text-sm text-zinc-400">{caption}</div>
      ) : null}
    </div>
  );
}
