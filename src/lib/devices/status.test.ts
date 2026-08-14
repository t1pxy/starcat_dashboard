import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { bucketTotal, distributionsFor } from "./status";
import {
  AGE_ANCIENT_YEARS,
  AGE_OLD_YEARS,
  CONTACT_OK_DAYS,
} from "./thresholds";

describe("bucketTotal", () => {
  it("adds the ids folded into a drawn segment", () => {
    // "never reported" and "went quiet" are both simply unreachable, so they
    // share one segment rather than spending a fifth colour.
    const counts = { lost: 4, never: 3, ok: 10 };
    const merged = { id: "lost", label: "", tone: "critical" as const, merges: ["never"] };
    assert.equal(bucketTotal(counts, merged), 7);
  });

  it("counts a missing bucket as zero rather than NaN", () => {
    assert.equal(bucketTotal({}, { id: "ok", label: "", tone: "good" }), 0);
  });
});

describe("distributionsFor", () => {
  it("labels the contact chart with the threshold it was actually cut at", () => {
    // A bar drawn at 90 days under a legend saying 30 is worse than no bar.
    const contact = distributionsFor(90).find((spec) => spec.key === "contact");
    const lost = contact?.buckets.find((bucket) => bucket.id === "lost");
    assert.equal(lost?.label, "ขาดการติดต่อ (90 วันขึ้นไป)");
  });

  it("gives the middle band a range when there is room for one", () => {
    const contact = distributionsFor(30).find((spec) => spec.key === "contact");
    const slow = contact?.buckets.find((bucket) => bucket.id === "slow");
    assert.equal(slow?.label, `เริ่มเงียบ (${CONTACT_OK_DAYS + 1}–29 วัน)`);
  });

  it("names the middle band instead when the range would read backwards", () => {
    // At ?stale=3 there is no "8–2 วัน" to describe.
    const contact = distributionsFor(3).find((spec) => spec.key === "contact");
    const slow = contact?.buckets.find((bucket) => bucket.id === "slow");
    assert.equal(slow?.label, "เริ่มเงียบ");
  });

  it("builds the age labels from the same constants the SQL buckets use", () => {
    const age = distributionsFor(30).find((spec) => spec.key === "age");
    const labels = age?.buckets.map((bucket) => bucket.label);
    assert.ok(labels?.includes(`ไม่เกิน ${AGE_OLD_YEARS} ปี`));
    assert.ok(labels?.includes(`${AGE_OLD_YEARS}–${AGE_ANCIENT_YEARS} ปี`));
  });

  it("reports the never-seen count as a footnote rather than losing it", () => {
    const contact = distributionsFor(30).find((spec) => spec.key === "contact");
    assert.equal(contact?.footnote?.({ never: 3 }), "ในจำนวนนี้ ไม่เคยติดต่อเข้ามาเลย 3 เครื่อง");
    assert.equal(contact?.footnote?.({}), null);
  });

  it("covers all four fleet health questions", () => {
    assert.deepEqual(
      distributionsFor(30).map((spec) => spec.key),
      ["contact", "warranty", "windows", "age"],
    );
  });
});
