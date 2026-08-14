import { ChartsSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-[1600px] p-4 lg:p-6">
      <ChartsSkeleton />
    </main>
  );
}
