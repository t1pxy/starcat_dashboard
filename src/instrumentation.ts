import { EventEmitter } from "node:events";

/**
 * Raises Node's listener-count warning threshold for the server process.
 *
 * Streaming a page to a *slow* client produces this on every visit from another
 * machine on the network (never from localhost, where the socket accepts
 * everything at once):
 *
 *   MaxListenersExceededWarning: 11 drain listeners added to [Gzip].
 *
 * Nothing is leaking. Next.js waits out backpressure by attaching a one-shot
 * `drain` listener per chunk it could not write (`next/dist/server/pipe-readable`),
 * and the `compression` middleware forwards those registrations onto the gzip
 * stream, so a handful of chunks queued behind a real network link trips Node's
 * default limit of 10. Every one of them is removed by the next drain event.
 *
 * The threshold is a leak *diagnostic*, so it is raised rather than worked
 * around: 64 still catches an emitter that genuinely accumulates listeners,
 * while leaving room for a page that streams faster than the LAN drains it.
 */
export function register() {
  // The edge runtime has no EventEmitter and never streams through Node's http
  // server, so there is nothing to raise there.
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  EventEmitter.defaultMaxListeners = 64;
}
