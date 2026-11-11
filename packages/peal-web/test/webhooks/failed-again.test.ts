import { describe, expect, it } from "@effect/vitest";

import { failedToSendAgain } from "#webhooks/failed-again.ts";

// Deliveries newest first, as the log lists them: an id that sorts later
// is newer.
const delivery = (id: string, eventId: string, status: string) => ({
  eventId,
  id: `0190000${id}`,
  status,
});

describe(failedToSendAgain, () => {
  it("counts each event whose last delivery to the endpoint failed, once", () => {
    expect(
      failedToSendAgain([
        // Event a: failed, then sent again and failed again.
        delivery("4", "a", "failed"),
        // Event b: failed, then sent again, which succeeded.
        delivery("3", "b", "succeeded"),
        delivery("2", "a", "failed"),
        delivery("1", "b", "failed"),
        // Event c: failed once.
        delivery("0", "c", "failed"),
      ])
    ).toBe(2);
  });

  it("leaves out an event sent again that waits for its attempt", () => {
    expect(
      failedToSendAgain([
        delivery("2", "a", "pending"),
        delivery("1", "a", "failed"),
      ])
    ).toBe(0);
  });
});
