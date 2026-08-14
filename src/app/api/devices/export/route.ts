import type { NextRequest } from "next/server";

import { buildDeviceWorkbook, exportFilename } from "@/lib/devices/excel";
import { parseFilters, parseSort, type RawSearchParams } from "@/lib/devices/filters";
import { getExportData } from "@/lib/devices/query";
import { clientKey, rateLimit } from "@/lib/rate-limit";

/**
 * Generous enough that nobody doing their job will meet it — the office shares
 * a handful of outbound addresses — but low enough that a retry loop stops
 * hammering the helpdesk database within a minute.
 */
const EXPORT_LIMIT = { limit: 20, windowMs: 60_000 };

/** `?brand=HP&brand=Dell` has to survive as an array, so collect duplicates. */
function toRawParams(url: URL): RawSearchParams {
  const params: RawSearchParams = {};
  for (const key of new Set(url.searchParams.keys())) {
    const values = url.searchParams.getAll(key);
    params[key] = values.length > 1 ? values : values[0];
  }
  return params;
}

export async function GET(request: NextRequest) {
  const limit = rateLimit(clientKey(request), EXPORT_LIMIT);
  if (!limit.ok) {
    return Response.json(
      { error: "ขอไฟล์ถี่เกินไป กรุณารอสักครู่แล้วลองใหม่" },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      },
    );
  }

  const raw = toRawParams(new URL(request.url));
  const filters = parseFilters(raw);
  const sort = parseSort(raw);

  try {
    // The export mirrors exactly what the dashboard is showing, minus the
    // pagination — same filters, same sort, every matching row.
    const { devices, summary, outdated, stale } = await getExportData(
      filters,
      sort,
    );

    const workbook = await buildDeviceWorkbook({
      devices,
      summary,
      filters,
      outdated,
      stale,
    });

    return new Response(new Uint8Array(workbook), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${exportFilename()}"`,
        "Content-Length": String(workbook.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[devices/export] สร้างไฟล์ Excel ไม่สำเร็จ", error);
    return Response.json(
      { error: "สร้างไฟล์ Excel ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" },
      { status: 500 },
    );
  }
}
