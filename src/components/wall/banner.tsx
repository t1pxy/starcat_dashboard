import { TONE_ON_DARK } from "@/components/ui/tone";
import { formatNumber } from "@/lib/devices/format";
import type { Summary } from "@/lib/devices/types";

/**
 * The one line somebody glancing up from their desk actually reads. Green means
 * "nothing for you"; anything else names the work rather than just colouring
 * the screen, because a red banner that does not say what is red is a fire
 * alarm with no address.
 */
export function Banner({
  summary,
  staleDays,
}: {
  summary: Summary;
  staleDays: number;
}) {
  const jobs = [
    summary.staleAgents > 0
      ? `ตามหา ${formatNumber(summary.staleAgents)} เครื่อง`
      : null,
    summary.outdatedWindows > 0
      ? `อัพเดท Windows ${formatNumber(summary.outdatedWindows)} เครื่อง`
      : null,
    summary.warrantyExpired > 0
      ? `ประกันหมดแล้ว ${formatNumber(summary.warrantyExpired)} เครื่อง`
      : null,
  ].filter(Boolean);

  if (jobs.length === 0) {
    return (
      <div
        className={`rounded-2xl border px-6 py-5 text-2xl font-medium ${TONE_ON_DARK.good}`}
      >
        ทุกเครื่องปกติ — ไม่มีงานค้าง
        <span
          lang="en"
          className="ml-3 text-lg font-normal text-emerald-500/80"
        >
          All clear
        </span>
      </div>
    );
  }

  // Machines nobody can reach outrank machines that merely need patching: the
  // first is a search, the second is a scheduled job.
  const critical = summary.staleAgents > 0;

  return (
    <div
      className={`rounded-2xl border px-6 py-5 ${
        critical ? TONE_ON_DARK.critical : TONE_ON_DARK.warning
      }`}
    >
      <div className="text-2xl font-medium">มีงานค้าง {jobs.join(" · ")}</div>
      <div className="mt-1 text-base text-zinc-400">
        นับ &quot;ไม่ติดต่อ&quot; ที่ {staleDays} วันขึ้นไป
      </div>
    </div>
  );
}
