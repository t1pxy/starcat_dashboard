import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { WINDOWS_BUILDS } from "./windows-releases";
import {
  describePatchGap,
  patchSeverity,
  patchStatus,
} from "./windows-servicing";

/** A build the generated table actually contains, so the tests describe the
 *  real reference data rather than a fixture that could drift away from it. */
const [build, entry] = Object.entries(WINDOWS_BUILDS).find(
  ([, value]) => value.revisions.length > 1 && !value.ended,
)!;

const newest = entry.revisions[0];
const older = entry.revisions[entry.revisions.length - 1];

describe("patchStatus", () => {
  it("says nothing when the build is not one Microsoft publishes", () => {
    // An Insider build, or a device with no agent reporting an OS at all —
    // guessing here would invent a patch gap that does not exist.
    assert.equal(patchStatus("99999", "1"), null);
    assert.equal(patchStatus(null, "1"), null);
    assert.equal(patchStatus(undefined, undefined), null);
  });

  it("reports a fully patched machine as zero releases behind", () => {
    const status = patchStatus(build, String(newest.ubr));
    assert.ok(status);
    assert.equal(status.releasesBehind, 0);
    assert.equal(status.daysBehind, 0);
    assert.equal(status.level, `${build}.${newest.ubr}`);
  });

  it("counts every published revision newer than the machine's", () => {
    const status = patchStatus(build, String(older.ubr));
    assert.ok(status);
    assert.equal(status.releasesBehind, entry.revisions.length - 1);
    assert.ok((status.daysBehind ?? 0) >= 0);
  });

  it("still reports servicing dates when the revision is unrecognised", () => {
    // The half that does not depend on knowing which revision is installed.
    const status = patchStatus(build, "0");
    assert.ok(status);
    assert.equal(status.current, null);
    assert.equal(status.endOfServicing, entry.endOfServicing);
  });

  it("falls back to the bare build when the revision is not a number", () => {
    const status = patchStatus(build, "not-a-number");
    assert.ok(status);
    assert.equal(status.level, build);
    assert.equal(status.releasesBehind, 0);
  });
});

describe("patchSeverity", () => {
  it("treats an unknown status as nothing to report", () => {
    assert.equal(patchSeverity(null), "ok");
  });

  it("treats a fully patched machine as ok", () => {
    assert.equal(patchSeverity(patchStatus(build, String(newest.ubr))), "ok");
  });

  it("ranks an unsupported version above any number of missed updates", () => {
    // No amount of patching fixes it — the machine needs a new Windows.
    const ended = Object.entries(WINDOWS_BUILDS).find(([, value]) => value.ended);
    if (!ended) return; // The table may legitimately contain no ended build.
    const [endedBuild, endedEntry] = ended;
    const status = patchStatus(endedBuild, String(endedEntry.revisions[0]?.ubr));
    assert.equal(patchSeverity(status), "unsupported");
  });
});

describe("describePatchGap", () => {
  it("says nothing when there is no status to describe", () => {
    assert.equal(describePatchGap(null), null);
  });

  it("confirms a fully patched machine in words", () => {
    assert.equal(
      describePatchGap(patchStatus(build, String(newest.ubr))),
      "อัพเดทครบแล้ว",
    );
  });

  it("names how many releases a machine has skipped", () => {
    const gap = describePatchGap(patchStatus(build, String(older.ubr)));
    assert.ok(gap?.startsWith(`ตามหลัง ${entry.revisions.length - 1} แพตช์`));
  });

  it("flags a revision Microsoft never published", () => {
    const gap = describePatchGap(patchStatus(build, "0"));
    assert.ok(gap?.includes("(รุ่นนอกรายการ Microsoft)"));
  });
});
