function Block({ className }: { className: string }) {
  return (
    <div
      className={`animate-pulse rounded-xl border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900 ${className}`}
    />
  );
}

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-[1600px] space-y-4 p-4 lg:p-6">
      <Block className="h-14 border-transparent bg-transparent dark:border-transparent dark:bg-transparent" />
      <Block className="h-9" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => (
          <Block key={index} className="h-28" />
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Block key={index} className="h-56" />
        ))}
      </div>
      <Block className="h-72" />
    </main>
  );
}
