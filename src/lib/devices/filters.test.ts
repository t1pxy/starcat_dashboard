import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildQueryString,
  countActiveFilters,
  parseFilters,
  parsePage,
  parseSort,
  staleThreshold,
} from "./filters";
import { MAX_STALE_DAYS, MIN_STALE_DAYS, STALE_DAYS } from "./thresholds";

describe("parseFilters", () => {
  it("defaults to the computers scope by leaving it unset", () => {
    assert.equal(parseFilters({}).scope, undefined);
    assert.equal(parseFilters({ scope: "all" }).scope, "all");
    // Anything else is not a scope the dashboard knows.
    assert.equal(parseFilters({ scope: "printers" }).scope, undefined);
  });

  it("reads a dimension as repeated params and as a comma list", () => {
    assert.deepEqual(parseFilters({ brand: ["HP", "Dell"] }).brand, ["HP", "Dell"]);
    assert.deepEqual(parseFilters({ brand: "HP,Dell" }).brand, ["HP", "Dell"]);
  });

  it("drops empty filter values rather than filtering on nothing", () => {
    assert.equal(parseFilters({ brand: "" }).brand, undefined);
    assert.equal(parseFilters({ q: "   " }).search, undefined);
  });

  it("only accepts the two online values", () => {
    assert.equal(parseFilters({ online: "true" }).online, "true");
    assert.equal(parseFilters({ online: "false" }).online, "false");
    assert.equal(parseFilters({ online: "yes" }).online, undefined);
  });

  it("strips absent keys so the active-filter count is truthful", () => {
    assert.equal(countActiveFilters(parseFilters({})), 0);
    // `scope` is a change of subject, not a restriction, so it is not counted.
    assert.equal(countActiveFilters(parseFilters({ scope: "all" })), 0);
    assert.equal(
      countActiveFilters(parseFilters({ brand: "HP", online: "true" })),
      2,
    );
  });
});

describe("numeric parameters are bounded before they reach SQL", () => {
  it("clamps the silence threshold to a whole number of days", () => {
    assert.equal(parseFilters({ stale: "45" }).staleDays, 45);
    assert.equal(parseFilters({ stale: "0" }).staleDays, MIN_STALE_DAYS);
    assert.equal(parseFilters({ stale: "-5" }).staleDays, MIN_STALE_DAYS);
    assert.equal(parseFilters({ stale: "1e9" }).staleDays, MAX_STALE_DAYS);
    assert.equal(parseFilters({ stale: "7.9" }).staleDays, 7);
    assert.equal(parseFilters({ stale: "abc" }).staleDays, undefined);
  });

  it("keeps warranty days inside the range a SQL int can hold", () => {
    assert.equal(parseFilters({ warrantyWithin: "90" }).warrantyWithinDays, 90);
    // Already-expired warranties are a negative number of days remaining.
    assert.equal(parseFilters({ warrantyWithin: "0" }).warrantyWithinDays, 0);
    assert.equal(
      parseFilters({ warrantyWithin: "99999999999" }).warrantyWithinDays,
      2_147_483_647,
    );
  });

  it("keeps minimum age inside DECIMAL(5,1) but does not round it", () => {
    // Half a year is meaningful and the column can hold it.
    assert.equal(parseFilters({ minAge: "5.5" }).minAgeYears, 5.5);
    assert.equal(parseFilters({ minAge: "9999999" }).minAgeYears, 9999.9);
  });

  it("keeps the page a positive whole number", () => {
    assert.equal(parsePage({}), 1);
    assert.equal(parsePage({ page: "3" }), 3);
    assert.equal(parsePage({ page: "-5" }), 1);
    assert.equal(parsePage({ page: "abc" }), 1);
    // Interpolating this one produced `OFFSET 5e+22 ROWS`, which is not T-SQL.
    assert.equal(parsePage({ page: "1e21" }), 1_000_000);
  });
});

describe("staleThreshold", () => {
  it("falls back to the shared default when the reader has not chosen", () => {
    assert.equal(staleThreshold({}), STALE_DAYS);
    assert.equal(staleThreshold({ staleDays: 90 }), 90);
  });
});

describe("parseSort", () => {
  it("accepts a column the table can actually order by", () => {
    assert.deepEqual(parseSort({ sort: "lastSeen", dir: "desc" }), {
      column: "lastSeen",
      direction: "desc",
    });
  });

  it("defaults to ascending for anything that is not 'desc'", () => {
    assert.equal(parseSort({ sort: "brand" })?.direction, "asc");
    assert.equal(parseSort({ sort: "brand", dir: "sideways" })?.direction, "asc");
  });

  it("rejects a column that is not on the sortable whitelist", () => {
    // `agentId` is a real Device field but deliberately not sortable, and this
    // is the value that would otherwise be interpolated into ORDER BY.
    assert.equal(parseSort({ sort: "agentId" }), undefined);
    assert.equal(parseSort({ sort: "1; DROP TABLE x" }), undefined);
    assert.equal(parseSort({}), undefined);
  });
});

describe("buildQueryString", () => {
  it("returns an empty string rather than a bare question mark", () => {
    assert.equal(buildQueryString({}, {}), "");
  });

  it("keeps the current params and applies the patch over them", () => {
    assert.equal(
      buildQueryString({ brand: "HP" }, { department: "IT" }),
      "?brand=HP&department=IT",
    );
  });

  it("removes a key set to null", () => {
    assert.equal(buildQueryString({ brand: "HP" }, { brand: null }), "");
  });

  it("resets paging on any change that is not an explicit page move", () => {
    assert.equal(buildQueryString({ page: "7" }, { brand: "HP" }), "?brand=HP");
    assert.equal(buildQueryString({ page: "7" }, { page: "8" }), "?page=8");
  });

  it("preserves repeated values for a multi-value filter", () => {
    assert.equal(
      buildQueryString({ brand: ["HP", "Dell"] }, {}),
      "?brand=HP&brand=Dell",
    );
  });
});
