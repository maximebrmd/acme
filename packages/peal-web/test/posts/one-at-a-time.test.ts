import { setTimeout as wait } from "node:timers/promises";

import { describe, expect, it } from "@effect/vitest";

import { oneAtATime } from "#posts/one-at-a-time.ts";

describe(oneAtATime, () => {
  it("makes one create and one schedule of two clicks 40 ms apart", async () => {
    const calls: string[] = [];
    const guard = oneAtATime();

    // What "Publish now" does on a new post: create it, then schedule it.
    const publishNow = async () => {
      calls.push("create");
      await wait(60);
      calls.push("schedule");
      await wait(60);
    };

    const first = guard.run(publishNow);

    await wait(40);

    const second = guard.run(publishNow);

    await Promise.all([first, second]);

    expect(calls).toStrictEqual(["create", "schedule"]);
  });

  it("says whether it took the action", async () => {
    const guard = oneAtATime();

    const taken = guard.run(async () => {
      await wait(10);
    });

    await expect(
      guard.run(async () => {
        await wait(10);
      })
    ).resolves.toBeFalsy();
    await expect(taken).resolves.toBeTruthy();
  });

  it("takes the next action once the last one ended, failed or not", async () => {
    const guard = oneAtATime();

    await expect(
      guard.run(async () => {
        await wait(1);
        throw new Error("synthetic failure");
      })
    ).rejects.toThrow("synthetic failure");
    await expect(
      guard.run(async () => {
        await wait(1);
      })
    ).resolves.toBeTruthy();
  });
});
