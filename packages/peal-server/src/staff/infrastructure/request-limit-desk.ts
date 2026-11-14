import { Effect, Layer, Option } from "effect";

import { RequestLimitSettings } from "#activity/application/request-limit-settings.ts";
import type { WorkspaceRequestLimit } from "#activity/application/request-limit-settings.ts";
import { RequestLimitDesk } from "#staff/application/ports/request-limit-desk.ts";
import type { StaffRequestLimit } from "#staff/application/ports/request-limit-desk.ts";

const viewOf = (limit: WorkspaceRequestLimit): StaffRequestLimit => ({
  bills: limit.bills,
  override: limit.override.pipe(
    Option.map(({ requestsPerMinute, setAt }) => ({ requestsPerMinute, setAt }))
  ),
  paying: limit.paying,
  policy: limit.policy,
  requestsPerMinute: limit.requestsPerMinute,
});

/** RequestLimitDesk, on the activity context's settings. */
export const ActivityRequestLimitDesk = Layer.effect(
  RequestLimitDesk,
  Effect.gen(function* ActivityRequestLimitDesk() {
    const settings = yield* RequestLimitSettings;

    return RequestLimitDesk.of({
      of: (workspaceId) => settings.of(workspaceId).pipe(Effect.map(viewOf)),
      set: (workspaceId, requestsPerMinute) =>
        settings.set(workspaceId, requestsPerMinute).pipe(
          Effect.map((limit) => Option.some(viewOf(limit))),
          Effect.catchTag("RequestLimitsUnbilled", () => Effect.succeedNone)
        ),
    });
  })
);
