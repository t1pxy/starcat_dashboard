/**
 * Loading skeletons shaped like the pages they stand in for.
 *
 * There was one skeleton, at `/devices/loading.tsx`, and in the App Router a
 * `loading.tsx` covers every route beneath its segment — so the same light-mode
 * six-card layout was being shown while loading the charts page (wrong shape)
 * *and* the wall display (a white flash before a black screen). Each route now
 * gets the shape it is actually about to render, and the same component backs
 * both the route-level `loading.tsx` and the in-page `<Suspense>` fallback so
 * the two can never drift.
 */
function Block({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 ${className}`}
    />
  );
}

function Header() {
  // Transparent: the header area is text, not a card, so a filled block there
  // reads as a component that never arrives.
  return <Block className="h-20 border-transparent bg-transparent dark:border-transparent dark:bg-transparent" />;
}

function KpiRow() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: 6 }, (_, index) => (
        <Block key={index} className="h-28" />
      ))}
    </div>
  );
}

/** `/devices` — filter bar, tiles, two work queues, then the device list. */
export function TablesSkeleton() {
  return (
    <div className="space-y-4">
      <Header />
      <Block className="h-9" />
      <KpiRow />
      <Block className="h-64" />
      <Block className="h-64" />
      <Block className="h-96" />
    </div>
  );
}

/** `/devices/charts` — tiles, department table, four status bars, breakdowns. */
export function ChartsSkeleton() {
  return (
    <div className="space-y-4">
      <Header />
      <Block className="h-9" />
      <KpiRow />
      <Block className="h-72" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Block key={index} className="h-56" />
        ))}
      </div>
      <Block className="h-64" />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Block key={index} className="h-56" />
        ))}
      </div>
    </div>
  );
}

/** The wall display, which is dark by design — so its skeleton is too. */
export function WallSkeleton() {
  return (
    <div className="flex min-h-screen flex-col gap-4 bg-zinc-950 p-6">
      <div className="h-16 animate-pulse rounded-2xl bg-zinc-900/60" />
      <div className="h-20 animate-pulse rounded-2xl bg-zinc-900/60" />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="h-32 animate-pulse rounded-2xl bg-zinc-900/60"
          />
        ))}
      </div>
      <div className="grid flex-1 gap-4 xl:grid-cols-2">
        <div className="animate-pulse rounded-2xl bg-zinc-900/60" />
        <div className="animate-pulse rounded-2xl bg-zinc-900/60" />
      </div>
    </div>
  );
}
