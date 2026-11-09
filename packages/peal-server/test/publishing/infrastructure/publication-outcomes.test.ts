import { assert, describe, it } from "@effect/vitest";
import { Effect } from "effect";

import { recordTargetRun } from "#publishing/application/post-publication.ts";
import { FakePlatform } from "#publishing/infrastructure/fake-platform-publisher.ts";
import { MediaRejected } from "#shared/domain/media-rejected.ts";

import {
  eventually,
  isFinished,
  isSuspended,
  newChannel,
  onServerAt,
  scheduleIn,
  schedulePost,
  setTime,
  targetsOf,
} from "./harness.ts";
import { Outcomes } from "./recorded-outcomes.ts";

const timeout = 60_000;

describe("PublicationOutcomes", () => {
  it.effect(
    "hears how each target ended, once, however often the step runs",
    () =>
      onServerAt(
        "2026-06-15T07:00:00Z",
        Effect.gen(function* once() {
          const platform = yield* FakePlatform;
          const published = yield* newChannel;
          const failed = yield* newChannel;
          const unconfirmed = yield* newChannel;

          yield* platform.script(failed, [
            { _tag: "fail", failure: new MediaRejected({ code: "too-large" }) },
          ]);
          yield* platform.script(unconfirmed, [{ _tag: "loseResponse" }]);

          const post = yield* schedulePost(
            [published, failed, unconfirmed],
            scheduleIn("2026-06-15T08:00:00Z")
          );

          yield* eventually("the job sleeps", isSuspended(post.id));
          yield* setTime("2026-06-15T08:00:00Z");
          yield* eventually("the post finishes", isFinished(post.id));

          const told = yield* Outcomes.use(({ told: all }) => all);

          const statusOn = (channelId: string) =>
            told
              .filter((target) => target.channelId === channelId)
              .map((target) => target.status._tag);

          assert.deepStrictEqual(statusOn(published), ["published"]);
          assert.deepStrictEqual(statusOn(failed), ["failed"]);
          assert.deepStrictEqual(statusOn(unconfirmed), ["unconfirmed"]);

          // The step run again, as after a crash before its result was
          // stored, finds the target settled and tells nothing more.
          const [target] = yield* targetsOf(post.id);

          assert(target !== undefined);

          yield* recordTargetRun(target.id, target.round, {
            _tag: "failed",
            reason: "unavailable",
          });

          assert.lengthOf(yield* Outcomes.use(({ told: all }) => all), 3);
        })
      ),
    timeout
  );
});
