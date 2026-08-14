import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { describeDeviceName, parseDeviceName } from "./device-name";

describe("parseDeviceName", () => {
  it("decodes year, ownership and form factor", () => {
    assert.deepEqual(parseDeviceName("25PDT001"), {
      year: 2025,
      ownership: "owned",
      formFactor: "desktop",
      runningNumber: "001",
    });
  });

  it("reads R as leased and NB as laptop", () => {
    const parts = parseDeviceName("23RNB042");
    assert.equal(parts?.ownership, "leased");
    assert.equal(parts?.formFactor, "laptop");
    assert.equal(parts?.year, 2023);
  });

  it("accepts lower case, since the scheme is about position not case", () => {
    assert.deepEqual(parseDeviceName("25pdt001"), parseDeviceName("25PDT001"));
  });

  it("ignores surrounding whitespace", () => {
    assert.equal(parseDeviceName("  25PDT001  ")?.year, 2025);
  });

  it("returns null rather than guessing at a non-conforming name", () => {
    // Real examples from the register — hand-named machines and spares.
    for (const name of ["DESKTOP-VGKC2IQ", "IHL-ADOBE", "1PDT001", "25XDT001", "25PDT", ""]) {
      assert.equal(parseDeviceName(name), null, `expected null for ${name}`);
    }
  });

  it("treats a missing name as undecodable", () => {
    assert.equal(parseDeviceName(null), null);
    assert.equal(parseDeviceName(undefined), null);
  });

  it("describes the decoded parts in Christian-era years", () => {
    const parts = parseDeviceName("25PDT001");
    assert.ok(parts);
    // ค.ศ. throughout — a Buddhist-era 2568 here would be the bug this guards.
    assert.equal(describeDeviceName(parts), "ปี 2025 · ซื้อ · ตั้งโต๊ะ");
  });
});
