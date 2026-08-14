import { Suspense } from "react";

import { DashboardHeader } from "@/components/dashboard-header";
import { DeviceTable } from "@/components/device-table";
import { FilterBar } from "@/components/filter-bar";
import { QueueTable } from "@/components/queue-table";
import { TablesSkeleton } from "@/components/skeletons";
import { SummaryCards } from "@/components/summary-cards";
import { SectionHeading } from "@/components/ui/typography";
import { OUTDATED_COLUMNS, STALE_COLUMNS } from "@/lib/devices/columns";
import {
  countActiveFilters,
  parseFilters,
  parsePage,
  parseSort,
  staleThreshold,
  type RawSearchParams,
} from "@/lib/devices/filters";
import { getFacets, getTables } from "@/lib/devices/query";
import { STALE_DAYS } from "@/lib/devices/schema";

export const metadata = {
  title: "ตารางอุปกรณ์ — Starcat Helpdesk",
  description: "รายการอุปกรณ์และงานที่ต้องตามจากระบบ Starcat Helpdesk",
};

const PAGE_SIZE = 50;

/** Matches `queueLimit` below, so a capped list can say that it is capped. */
const QUEUE_LIMIT = 200;

/**
 * The tables view. Every query below receives the same `filters`, so the KPI
 * tiles, the two work queues, the device list and the Excel export can never
 * disagree about what is being shown.
 */
async function Tables({ params }: { params: RawSearchParams }) {
  const filters = parseFilters(params);
  const sort = parseSort(params);
  const page = parsePage(params);

  const [data, facets] = await Promise.all([
    getTables(filters, {
      sort,
      page,
      pageSize: PAGE_SIZE,
      queueLimit: QUEUE_LIMIT,
    }),
    getFacets(filters.scope),
  ]);
  // Stamped after the query, not before: this is what the numbers below are
  // true as of, and the header keeps saying how long ago that was.
  const fetchedAt = new Date().toISOString();
  const { summary, outdated, stale } = data;

  const newest = summary.newestWindowsVersion ?? "—";
  // Whatever the reader set in the filter bar, spelled back to them here and in
  // the tile above, so the page never states a threshold it did not use.
  const staleDays = staleThreshold(filters);
  const activeFilters = countActiveFilters(filters);

  return (
    <div className="space-y-4">
      <DashboardHeader
        active="tables"
        params={params}
        total={summary.total}
        fetchedAt={fetchedAt}
      />

      <FilterBar
        facets={facets}
        activeCount={activeFilters}
        defaultStaleDays={STALE_DAYS}
      />

      <SummaryCards summary={summary} staleDays={staleDays} />

      {/*
        Two queues, two jobs. "อัพเดท" is work you can do right now over the
        network; "ไม่ได้ใช้งานนาน" is work that starts with finding the machine.
        Grouping them under one heading is what says the section is a to-do list
        rather than two more tables of inventory.
      */}
      <SectionHeading
        title="งานที่ต้องทำ"
        english="Work queues"
        hint="เครื่องที่ต้องลงมือทำอะไรบางอย่าง แยกตามชนิดของงาน"
      />

      <div className="space-y-4">
        <QueueTable
          title="เครื่องที่ต้องอัพเดท Windows"
          english="Needs Windows update"
          description={`ติดต่อได้ แต่ยังไม่ใช่เวอร์ชันล่าสุดในองค์กร (${newest})`}
          tone="warning"
          columns={OUTDATED_COLUMNS}
          devices={outdated}
          emptyLabel="ทุกเครื่องที่ติดต่อได้เป็นเวอร์ชันล่าสุดแล้ว 🎉"
          limit={QUEUE_LIMIT}
        />

        <QueueTable
          title="เครื่องที่ไม่ได้ใช้งานนาน"
          english="Inactive devices"
          description={`คอมพิวเตอร์ที่ไม่ติดต่อเข้ามาตั้งแต่ ${staleDays} วันขึ้นไป หรือไม่เคยติดต่อเลย — อัพเดทไม่ได้จนกว่าจะตามเจอ (ปรับจำนวนวันได้ที่ตัวกรอง “ไม่ติดต่อ”)`}
          tone="critical"
          columns={STALE_COLUMNS}
          devices={stale}
          emptyLabel="ทุกเครื่องติดต่อเข้ามาตามปกติ 🎉"
          limit={QUEUE_LIMIT}
        />
      </div>

      <SectionHeading
        title="รายการอุปกรณ์ทั้งหมด"
        english="Full inventory"
        hint="ทุกเครื่องที่ตรงกับตัวกรองปัจจุบัน เรียงและเปิดดูรายละเอียดได้"
      />

      <DeviceTable
        devices={data.devices}
        total={data.total}
        page={page}
        pageSize={PAGE_SIZE}
        sort={sort}
        params={params}
        filtersActive={activeFilters > 0}
      />
    </div>
  );
}

export default async function DevicesPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const params = await searchParams;

  return (
    <main className="mx-auto w-full max-w-[1600px] p-4 lg:p-6">
      <Suspense fallback={<TablesSkeleton />}>
        <Tables params={params} />
      </Suspense>
    </main>
  );
}
