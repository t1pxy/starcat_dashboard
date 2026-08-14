import { MUTED_TEXT } from "./tone";

/**
 * The dashboard's heading scale, in one place.
 *
 * Every heading here is bilingual — Thai label, English/technical name beside
 * it — which is how the helpdesk team refers to these fields in practice. That
 * pattern was written out by hand in about a dozen components, each with its own
 * font size and its own grey, which is why a section heading and a card heading
 * used to look identical and the reader had no way to tell a group from a thing
 * inside the group.
 *
 * Three levels, visibly different in size *and* weight:
 *
 *   PageTitle      h1  what this page is
 *   SectionHeading h2  a group of related cards
 *   CardTitle      h3  one card inside a group
 *
 * The English half is marked `lang="en"` so a Thai screen reader switches voice
 * instead of reading "Device Name" with Thai phonetics.
 */
export function Bilingual({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span lang="en" className={`font-normal ${MUTED_TEXT} ${className}`}>
      {children}
    </span>
  );
}

export function PageTitle({
  title,
  english,
}: {
  title: string;
  english: string;
}) {
  return (
    <h1 className="text-xl font-semibold text-zinc-900 sm:text-2xl dark:text-zinc-50">
      {title}
      <Bilingual className="ml-2 text-sm sm:text-base">{english}</Bilingual>
    </h1>
  );
}

export function SectionHeading({
  title,
  english,
  hint,
}: {
  title: string;
  english: string;
  /** One line saying what the group below is for, when it is not obvious. */
  hint?: string;
}) {
  return (
    <div className="pt-2">
      <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
        {title}
        <Bilingual className="ml-1.5 text-xs">{english}</Bilingual>
      </h2>
      {hint ? (
        <p className={`mt-0.5 text-xs ${MUTED_TEXT}`}>{hint}</p>
      ) : null}
    </div>
  );
}

export function CardTitle({
  title,
  english,
  hint,
}: {
  title: string;
  english: string;
  hint?: string;
}) {
  return (
    <div className="min-w-0">
      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        {title}
        <Bilingual className="ml-1.5 text-xs">{english}</Bilingual>
      </h3>
      {hint ? (
        <p className={`mt-0.5 text-xs ${MUTED_TEXT}`}>{hint}</p>
      ) : null}
    </div>
  );
}
