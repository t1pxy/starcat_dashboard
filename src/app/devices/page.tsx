import { Suspense } from "react";

import { DashboardHeader } from "@/components/dashboard-header";
import { DeviceTable } from "@/components/device-table";
import { FilterBar } from "@/components/filter-bar";
import { QueueTable } from "@/components/queue-table";
import { SummaryCards } from "@/components/summary-cards";
import { OUTDATED_COLUMNS, STALE_COLUMNS } from "@/lib/devices/columns";
import {
  countActiveFilters,
  parseFilters,
  parsePage,
  parseSort,
  type RawSearchParams,
} from "@/lib/devices/filters";
import { STALE_DAYS } from "@/lib/devices/schema";
import { getFacets, getTables } from "@/lib/devices/query";

export const metadata = {
  title: "ตารางอุปกรณ์ — Starcat Helpdesk",
  description: "รายการอุปกรณ์และงานที่ต้องตามจากระบบ Starcat Helpdesk",
};

const PAGE_SIZE = 50;

/** Matches `queueLimit` below, so a capped list can say that it is capped. */
const QUEUE_LIMIT = 200;

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-8 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
      {children}
    </div>
  );
}

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
  const { summary, outdated, stale } = data;

  const newest = summary.newestWindowsVersion ?? "—";

  return (
    <div className="space-y-4">
      <DashboardHeader active="tables" params={params} total={summary.total} />

      <FilterBar facets={facets} activeCount={countActiveFilters(filters)} />

      <SummaryCards summary={summary} />

      {/*
        Two queues, two jobs. "อัพเดท" is work you can do right now over the
        network; "ไม่ได้ใช้งานนาน" is work that starts with finding the machine.
        Mixing them in one list meant every row had to explain itself.
      */}
      <div className="space-y-4">
        <QueueTable
          title="เครื่องที่ต้องอัพเดท Windows"
          english="Needs Windows update"
          description={`ติดต่อได้ แต่ยังไม่ใช่เวอร์ชันล่าสุดในองค์กร (${newest})`}
          tone="warn"
          columns={OUTDATED_COLUMNS}
          devices={outdated}
          emptyLabel="ทุกเครื่องที่ติดต่อได้เป็นเวอร์ชันล่าสุดแล้ว 🎉"
          limit={QUEUE_LIMIT}
        />

        <QueueTable
          title="เครื่องที่ไม่ได้ใช้งานนาน"
          english="Inactive devices"
          description={`คอมพิวเตอร์ที่ไม่ติดต่อเข้ามาเกิน ${STALE_DAYS} วัน หรือไม่เคยติดต่อเลย — อัพเดทไม่ได้จนกว่าจะตามเจอ`}
          tone="bad"
          columns={STALE_COLUMNS}
          devices={stale}
          emptyLabel="ทุกเครื่องติดต่อเข้ามาตามปกติ 🎉"
          limit={QUEUE_LIMIT}
        />
      </div>

      <DeviceTable
        devices={data.devices}
        total={data.total}
        page={page}
        pageSize={PAGE_SIZE}
        sort={sort}
        params={params}
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
      <Suspense fallback={<Panel>กำลังโหลดข้อมูลจาก Starcat…</Panel>}>
        <Tables params={params} />
      </Suspense>
    </main>
  );
}
