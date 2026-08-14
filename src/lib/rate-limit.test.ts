import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { clientKey, rateLimit } from "./rate-limit";

/** Each test uses its own key so the shared window map cannot leak between
 *  them — the limiter is deliberately process-global. */
let counter = 0;
const nextKey = () => `test-${counter++}`;

describe("rateLimit", () => {
  it("allows requests up to the limit and refuses the one after", () => {
    const key = nextKey();
    const options = { limit: 3, windowMs: 60_000 };

    for (let attempt = 1; attempt <= 3; attempt++) {
      assert.equal(rateLimit(key, options).ok, true, `attempt ${attempt}`);
    }

    const refused = rateLimit(key, options);
    assert.equal(refused.ok, false);
    // The caller needs to know how long to wait, for `Retry-After`.
    assert.ok(refused.retryAfterSeconds >= 1);
  });

  it("counts each caller separately", () => {
    const options = { limit: 1, windowMs: 60_000 };
    const first = nextKey();
    const second = nextKey();

    assert.equal(rateLimit(first, options).ok, true);
    assert.equal(rateLimit(first, options).ok, false);
    // A colleague on a different address is unaffected.
    assert.equal(rateLimit(second, options).ok, true);
  });

  it("starts a fresh window once the old one has passed", async () => {
    const key = nextKey();
    const options = { limit: 1, windowMs: 20 };

    assert.equal(rateLimit(key, options).ok, true);
    assert.equal(rateLimit(key, options).ok, false);

    await new Promise((resolve) => setTimeout(resolve, 40));
    assert.equal(rateLimit(key, options).ok, true);
  });
});

describe("clientKey", () => {
  it("prefers the forwarded address, since a proxy hides the real one", () => {
    const request = new Request("http://localhost/api", {
      headers: { "x-forwarded-for": "10.0.0.5, 10.0.0.1" },
    });
    // The left-most entry is the original client; the rest are proxies.
    assert.equal(clientKey(request), "10.0.0.5");
  });

  it("falls back to x-real-ip, then to a shared bucket", () => {
    const realIp = new Request("http://localhost/api", {
      headers: { "x-real-ip": "10.0.0.9" },
    });
    assert.equal(clientKey(realIp), "10.0.0.9");
    assert.equal(clientKey(new Request("http://localhost/api")), "unknown");
  });
});
