import { Suspense } from "react";

import { BreakdownChart } from "@/components/breakdown-chart";
import { CompositionCharts } from "@/components/composition-charts";
import { DashboardHeader } from "@/components/dashboard-header";
import { DepartmentHealthTable } from "@/components/department-health";
import { FilterBar } from "@/components/filter-bar";
import { ChartsSkeleton } from "@/components/skeletons";
import { StatusBar } from "@/components/status-bar";
import { SummaryCards } from "@/components/summary-cards";
import { SectionHeading } from "@/components/ui/typography";
import {
  countActiveFilters,
  parseFilters,
  staleThreshold,
  type RawSearchParams,
} from "@/lib/devices/filters";
import { getCharts, getFacets } from "@/lib/devices/query";
import { STALE_DAYS } from "@/lib/devices/thresholds";
import { bucketTotal, distributionsFor } from "@/lib/devices/status";

export const metadata = {
  title: "กราฟอุปกรณ์ — Starcat Helpdesk",
  description:
    "สถานะอุปกรณ์แยกตามหน่วยงาน สถานะการติดต่อ ประกัน และองค์ประกอบของเครื่อง",
};

/** The plain "how many of each" bars, kept below the monitoring views. They
 *  answer inventory questions rather than health questions. */
const BREAKDOWNS = [
  { key: "category", title: "แยกตามหมวดหมู่", english: "By category" },
  { key: "brand", title: "แยกตามยี่ห้อ", english: "By brand" },
  { key: "model", title: "แยกตามรุ่น", english: "By model" },
  { key: "location", title: "แยกตามสถานที่", english: "By location" },
  {
    key: "windowsVersion",
    title: "แยกตามเวอร์ชัน Windows",
    english: "By Windows version",
  },
  { key: "deviceType", title: "แยกตามประเภท", english: "By type" },
] as const;

/**
 * The charts live on their own route so the tables page stays a work surface
 * and this one is the overview. Both read the same filters out of the URL, so
 * the view switcher moves between two readings of one filtered set.
 *
 * Ordered by what a monitor actually asks, most urgent first: which department
 * is in trouble, then how the whole fleet is doing on the four health
 * questions, then what the fleet is made of.
 */
async function Charts({ params }: { params: RawSearchParams }) {
  const filters = parseFilters(params);

  const [data, facets] = await Promise.all([
    getCharts(filters),
    getFacets(filters.scope),
  ]);
  const fetchedAt = new Date().toISOString();

  // The contact chart is cut at whatever the reader set, so its legend has to
  // be built from the same number rather than from the default.
  const staleDays = staleThreshold(filters);

  return (
    <div className="space-y-4">
      <DashboardHeader
        active="charts"
        params={params}
        total={data.summary.total}
        fetchedAt={fetchedAt}
      />

      <FilterBar
        facets={facets}
        activeCount={countActiveFilters(filters)}
        defaultStaleDays={STALE_DAYS}
      />

      <SummaryCards summary={data.summary} staleDays={staleDays} />

      <SectionHeading
        title="สถานะรายหน่วยงาน"
        english="By department"
        hint="หน่วยงานไหนมีงานค้างมากที่สุด เรียงตามจำนวนอุปกรณ์"
      />

      <DepartmentHealthTable departments={data.departments} params={params} />

      <SectionHeading
        title="สุขภาพของเครื่องทั้งหมด"
        english="Fleet health"
        hint="สัดส่วนของอุปกรณ์ทั้งหมดตามตัวกรองปัจจุบัน — เขียวคือปกติ เหลืองคือควรวางแผน แดงคือเลยกำหนดแล้ว"
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {distributionsFor(staleDays).map((spec) => {
          const counts = data.distributions[spec.key];
          return (
            <StatusBar
              key={spec.key}
              title={spec.title}
              english={spec.english}
              segments={spec.buckets.map((bucket) => ({
                label: bucket.label,
                tone: bucket.tone,
                count: bucketTotal(counts, bucket),
              }))}
              footnote={spec.footnote?.(counts)}
            />
          );
        })}
      </div>

      <SectionHeading
        title="องค์ประกอบของเครื่อง"
        english="Fleet composition"
        hint="อ่านจากรูปแบบชื่อเครื่อง — ซื้อหรือเช่า ตั้งโต๊ะหรือโน้ตบุ๊ก และได้มาปีไหน"
      />

      <CompositionCharts composition={data.composition} />

      <SectionHeading
        title="จำนวนอุปกรณ์แยกตามมิติต่างๆ"
        english="Inventory breakdowns"
        hint="คลิกที่แถบเพื่อเพิ่ม/เอาตัวกรองนั้นออก"
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {BREAKDOWNS.map((breakdown) => (
          <BreakdownChart
            key={breakdown.key}
            title={breakdown.title}
            english={breakdown.english}
            data={data.breakdowns[breakdown.key]}
            filterKey={breakdown.key}
            params={params}
          />
        ))}
      </div>
    </div>
  );
}

export default async function ChartsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = await searchParams;

  return (
    <main className="mx-auto w-full max-w-[1600px] p-4 lg:p-6">
      <Suspense fallback={<ChartsSkeleton />}>
        <Charts params={params} />
      </Suspense>
    </main>
  );
}
