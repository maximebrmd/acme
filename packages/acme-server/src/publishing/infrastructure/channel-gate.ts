import { Duration, Effect, Layer, Schedule } from "effect";
import { Entity } from "effect/cluster";
import { Rpc } from "effect/rpc";

import {
  PlatformPublisher,
  PublishRequestSchema,
} from "#publishing/application/platform-publisher.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import { PublishFailureSchema } from "#shared/domain/publish-failure.ts";
import type { PublishFailure } from "#shared/domain/publish-failure.ts";
import { PublishResultSchema } from "#shared/domain/publish-result.ts";
import type { PublishResult } from "#shared/domain/publish-result.ts";

/**
 * One entity per channel (its id is the channel id), which makes every call
 * to the channel's platform account, one at a time: handlers run in turn, so
 * two posts due at once on one account go out one after the other, and a
 * later token refresh or rate-limit check never races a publish.
 *
 * Calls are volatile: nothing about them is stored in the cluster tables, so
 * post content never lands there. The job calling through the gate is
 * durable, and the publication journal covers a call cut short.
 *
 * A publish runs whole inside its gate: the media uploads, the wait while
 * the platform processes them, the token renewed on demand, the post and its
 * confirmation. `Resume` checks a call an earlier run left in flight.
 */
export const ChannelGate = Entity.make("ChannelGate", [
  Rpc.make("Publish", {
    error: PublishFailureSchema,
    payload: { request: PublishRequestSchema },
    success: PublishResultSchema,
  }),
  Rpc.make("Resume", {
    error: PublishFailureSchema,
    payload: { request: PublishRequestSchema },
    success: PublishResultSchema,
  }),
]);

/**
 * Runs the gate with the platform adapters it is given. A bug in an adapter
 * fails its own call instead of restarting the entity, which would replay the
 * call in flight.
 */
export const ChannelGateLive = ChannelGate.toLayer(
  Effect.gen(function* ChannelGateLive() {
    const platforms = yield* PlatformPublisher;

    return ChannelGate.of({
      Publish: ({ payload }) => platforms.publish(payload.request),
      Resume: ({ payload }) => platforms.resume(payload.request),
    });
  }),
  { disableFatalDefects: true, maxIdleTime: Duration.minutes(10) }
);

// The gate did not take the call, so it was not sent: worth a few quick
// retries before the platform counts as unavailable.
const notTakenRetry = Schedule.exponential("100 millis", 2);

const notSent = () => Effect.fail(new PlatformUnavailable());

// A resume the gate did not take checked nothing: the earlier run may still
// have posted, so it is not a refusal.
const notChecked = () =>
  Effect.succeed<PublishResult>({
    _tag: "unconfirmed",
    reason: "interrupted",
  });

const unknownOutcome = (cause: unknown) =>
  Effect.logError("A platform call failed in its adapter", cause).pipe(
    Effect.as<PublishResult>({ _tag: "unconfirmed", reason: "adapterFailure" })
  );

/**
 * The PlatformPublisher the publishing jobs use: each call goes through its
 * channel's gate. Provide ChannelGateLive, with the real adapters, beside it.
 */
export const GatedPlatformPublisher = Layer.effect(
  PlatformPublisher,
  Effect.gen(function* GatedPlatformPublisher() {
    const gateFor = yield* ChannelGate.client;

    // Publish and Resume answer alike.
    type GateCall = ReturnType<ReturnType<typeof gateFor>["Publish"]>;

    const gated = (
      call: GateCall,
      notTaken: () => Effect.Effect<PublishResult, PublishFailure>
    ) =>
      call.pipe(
        Effect.retry({
          schedule: notTakenRetry,
          times: 4,
          while: (error) =>
            error._tag === "MailboxFull" ||
            error._tag === "EntityNotAssignedToRunner",
        }),
        Effect.catchTags({
          // A request with this id is being handled: it may have gone out.
          AlreadyProcessingMessage: () =>
            Effect.succeed<PublishResult>({
              _tag: "unconfirmed",
              reason: "noResponse",
            }),
          EntityNotAssignedToRunner: notTaken,
          MailboxFull: notTaken,
          PersistenceError: notTaken,
        }),
        // The adapter broke during the call, after the request may have
        // left: never a reason to send it again.
        Effect.catchDefect(unknownOutcome)
      );

    return PlatformPublisher.of({
      publish: (request) =>
        gated(gateFor(request.channelId).Publish({ request }), notSent),
      resume: (request) =>
        gated(gateFor(request.channelId).Resume({ request }), notChecked),
    });
  })
);
