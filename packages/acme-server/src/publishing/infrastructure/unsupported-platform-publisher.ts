import { Effect, Layer } from "effect";

import { PlatformPublisher } from "#publishing/application/platform-publisher.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";

/**
 * The publisher until the platform adapters exist: every call is refused
 * before anything is sent, so no post ever looks published when it is not.
 */
export const UnsupportedPlatformPublisher = Layer.succeed(
  PlatformPublisher,
  PlatformPublisher.of({
    publish: () =>
      Effect.fail(new BadRequest({ code: "platformNotSupported" })),
  })
);
