import { describe, expect, it } from "vitest";
import {
  isSessionStale,
  SESSION_HEARTBEAT_TIMEOUT_MS,
} from "@/lib/sync/session-lock";

describe("session lock", () => {
  it("considers session stale after timeout", () => {
    const now = Date.parse("2026-06-26T12:00:00.000Z");
    const heartbeat = new Date(
      now - SESSION_HEARTBEAT_TIMEOUT_MS - 1000
    ).toISOString();
    expect(isSessionStale(heartbeat, now)).toBe(true);
  });

  it("considers session active within timeout", () => {
    const now = Date.parse("2026-06-26T12:00:00.000Z");
    const heartbeat = new Date(now - 60_000).toISOString();
    expect(isSessionStale(heartbeat, now)).toBe(false);
  });
});
