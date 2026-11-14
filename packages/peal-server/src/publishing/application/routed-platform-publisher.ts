import { Effect, Layer, Option, Result } from "effect";

import { CurrentThreadedPlatforms } from "#publishing/application/threaded-platforms.ts";
import { ownRefusalCodes } from "#publishing/domain/own-refusals.ts";
import {
  followUpsThrough,
  rulesFor,
} from "#publishing/domain/platform-rules.ts";
import { partsOn } from "#publishing/domain/post-content.ts";
import type { PostTarget } from "#publishing/domain/post-target.ts";
import type { Post } from "#publishing/domain/post.ts";
import { postingMonthOf } from "#publishing/domain/posting-month.ts";
import {
  linksToShorten,
  withShortLinks,
} from "#publishing/domain/short-links.ts";
import {
  storableFailure,
  storableResult,
} from "#publishing/domain/storable-outcome.ts";
import type { DatabaseError } from "#shared/application/database-error.ts";
import type { MeterClaim } from "#shared/application/metered-usage.ts";
import type {
  AllowanceReached,
  AllowanceReason,
} from "#shared/domain/allowance-reached.ts";
import { withinAllowance } from "#shared/domain/allowance.ts";
import { BadRequest } from "#shared/domain/bad-request.ts";
import { PlatformUnavailable } from "#shared/domain/platform-unavailable.ts";
import type { Platform } from "#shared/domain/platform.ts";
import type { PublishFailure } from "#shared/domain/publish-failure.ts";
import type { PublishResult } from "#shared/domain/publish-result.ts";

import { LinkShortener } from "./link-shortener.ts";
import { PlatformClients } from "./platform-client.ts";
import type {
  OutgoingPost,
  PlatformClient,
  ReplyReference,
} from "./platform-client.ts";
import { PlatformCredentials } from "./platform-credentials.ts";
import { PlatformPublisher } from "./platform-publisher.ts";
import type { PublishRequest } from "./platform-publisher.ts";
import { PostAllowance } from "./post-allowance.ts";
import { PostMeter } from "./post-meter.ts";
import { PostRepository } from "./post-repository.ts";

// Nothing was sent yet: the database not answering is worth trying again.
const databaseDown = (failure: DatabaseError) =>
  Effect.logWarning("Could not read a post to publish", failure).pipe(
    Effect.andThen(Effect.fail(new PlatformUnavailable()))
  );

const overPlan = new BadRequest({ code: ownRefusalCodes.planLimit });

// Why the meter refused a part, as the target fails: each standing in
// words of its own (no payment method, a payment failing, a plan from
// before per-account pricing, the ceiling or the cap before a first paid
// invoice).
const meterCodes = {
  ceilingReached: ownRefusalCodes.xCeilingReached,
  notEnabled: ownRefusalCodes.paymentMethodRequired,
  paymentFailed: ownRefusalCodes.paymentFailed,
  paymentMethodRequired: ownRefusalCodes.paymentMethodRequired,
  planAllowance: ownRefusalCodes.perAccountPricingRequired,
  spendCapReached: ownRefusalCodes.xCeilingReached,
} as const satisfies { readonly [R in AllowanceReason]: string };

// The meter refused a part: in its standing's words, or, when parts of
// the thread are live already, as the thread cut there.
const meterRefusal = ({ reason }: AllowanceReached, live: number) =>
  new BadRequest({
    code: live > 0 ? ownRefusalCodes.xThreadCut : meterCodes[reason],
  });

// When the post was due: the time it was scheduled for.
const dueAt = (post: Post) =>
  post.status._tag === "publishing" ||
  post.status._tag === "finished" ||
  post.status._tag === "scheduled"
    ? Option.some(post.status.schedule.at)
    : Option.none();

// A first comment on a platform this server sends none to now.
const firstCommentsOff = "firstCommentsOff";

// The platform's own word for a poll it takes none of.
const pollNotSupported = "pollNotSupported";

const noReplyTarget = new BadRequest({
  code: ownRefusalCodes.replyTargetUnknown,
});

// What the part at `part` answers to: nothing for the post itself, and for
// a later part the first part and the one before it, as the platform named
// them when they went live. A part Peal has no id for, found by hand, can
// be answered by no one.
const replyTargetOf = (
  target: PostTarget,
  part: number
): Effect.Effect<Option.Option<ReplyReference>, BadRequest> => {
  if (part === 0) {
    return Effect.succeed(Option.none());
  }

  const root = target.liveParts[0]?.platformPostId ?? Option.none();
  const parent = target.liveParts[part - 1]?.platformPostId ?? Option.none();

  return Option.isSome(root) && Option.isSome(parent)
    ? Effect.succeed(Option.some({ parent: parent.value, root: root.value }))
    : Effect.fail(noReplyTarget);
};

// What the platform answered, as it is kept: the gate hands it to the
// job, which stores it in its history, its journal and the post's rows.
const storable = <R>(
  call: Effect.Effect<PublishResult, PublishFailure, R>
): Effect.Effect<PublishResult, PublishFailure, R> =>
  call.pipe(Effect.map(storableResult), Effect.mapError(storableFailure));

const interrupted: PublishResult = {
  _tag: "unconfirmed",
  reason: "interrupted",
};

/**
 * The PlatformPublisher the channel gates run: it reads the post and its
 * target, finds the channel's platform, and hands the part asked for, as it
 * reads on that channel, with the target's options and, after the first,
 * the posts it answers to, to the platform's client.
 * Before a post goes out, the workspace's plan must have room for it now,
 * not only when it was scheduled, as a trial or a larger plan may have
 * ended since: a workspace with more channels or members than its plan
 * allows sends nothing, and of the posts due in a month only the first its plan allows
 * go out, by their time. The others fail as `planLimit`, nothing sent. A
 * run resumed may have gone out already, and is checked no further; nor is
 * a part after the first, whose post is already out. Every part sent to a
 * platform that bills per post (X) is claimed on the billing account's
 * meter first (`PostMeter`): refused, nothing is sent (`paymentMethodRequired`,
 * `xCeilingReached`); refused by the platform, it is given back. A part
 * whose outcome is unknown stays claimed, as the platform may have billed
 * it.
 */
export const RoutedPlatformPublisher = Layer.effect(
  PlatformPublisher,
  Effect.gen(function* RoutedPlatformPublisher() {
    const posts = yield* PostRepository;
    const credentials = yield* PlatformCredentials;
    const clients = yield* PlatformClients;
    const allowance = yield* PostAllowance;
    const threaded = yield* CurrentThreadedPlatforms;
    const shortener = yield* LinkShortener;
    const meter = yield* PostMeter;

    // Sends the part, claimed first where the platform bills per post.
    // The first part a round sends checks first that the meter has room
    // for every part still to go out, so a thread is never cut for room
    // it lacked from the start; a later part refused anyway (the standing
    // changed meanwhile) cuts it there.
    const sendMetered = Effect.fn("Publishing.sendMetered")(
      function* sendMetered(
        client: PlatformClient,
        post: OutgoingPost,
        platform: Platform,
        thread: { readonly live: number; readonly texts: readonly string[] }
      ) {
        const refused = (reached: AllowanceReached) =>
          Effect.fail(meterRefusal(reached, thread.live));

        if (post.part === thread.live) {
          const room = yield* meter
            .fits(
              thread.texts.slice(post.part).map((text, index) => ({
                platform,
                // The part sent now as the channel receives it.
                text: index === 0 ? post.text : text,
                workspaceId: post.workspaceId,
              }))
            )
            .pipe(Effect.catchTag("DatabaseError", databaseDown));

          if (Option.isSome(room)) {
            return yield* refused(room.value);
          }
        }

        const claim = yield* meter
          .claim({ platform, text: post.text, workspaceId: post.workspaceId })
          .pipe(
            Effect.catchTags({
              AllowanceReached: refused,
              DatabaseError: databaseDown,
            })
          );

        const giveBack = (given: MeterClaim) =>
          meter
            .giveBack(given)
            .pipe(
              Effect.catchTag("DatabaseError", (failure) =>
                Effect.logWarning(
                  "Could not give back a part the platform refused",
                  failure
                )
              )
            );

        return yield* client.publish(post).pipe(
          Effect.tapError(() =>
            Option.match(claim, {
              onNone: () => Effect.void,
              onSome: giveBack,
            })
          )
        );
      }
    );

    // The part's text as the channel receives it: with its links' short
    // addresses when the post asks for them and the server has some. The
    // codes come from the table, so every run of an attempt sends the
    // same text; a table that cannot be written sends nothing.
    const textSent = Effect.fn("Publishing.textSent")(function* textSent(
      post: Post,
      request: PublishRequest,
      platform: Platform,
      text: string
    ) {
      if (!post.shortenLinks || Option.isNone(shortener.addresses)) {
        return text;
      }

      const links = linksToShorten(text, platform, shortener.addresses.value);

      if (links.length === 0) {
        return text;
      }

      const shortUrls = yield* shortener
        .shortened({
          channelId: request.channelId,
          destinations: links.map(({ address }) => address),
          part: request.part,
          postId: post.id,
          targetId: request.targetId,
          workspaceId: post.workspaceId,
        })
        .pipe(Effect.catchTag("DatabaseError", databaseDown));

      return withShortLinks(
        text,
        links.map((link, index) => ({
          ...link,
          shortUrl: shortUrls[index] ?? link.address,
        }))
      );
    });

    const withinPlan = Effect.fn("Publishing.withinPlan")(function* withinPlan(
      post: Post
    ) {
      const channels = yield* allowance.channels(post.workspaceId);

      yield* Result.isFailure(
        withinAllowance("channels", channels.allowed, channels.connected)
      )
        ? overPlan
        : Effect.void;

      const members = yield* allowance.members(post.workspaceId);

      yield* Result.isFailure(
        withinAllowance("members", members.allowed, members.taken)
      )
        ? overPlan
        : Effect.void;

      const allowed = yield* allowance.scheduledPerMonth(post.workspaceId);
      const at = dueAt(post);

      if (Option.isSome(allowed) && Option.isSome(at)) {
        const before = yield* posts.countGoingOutBefore(
          post.workspaceId,
          postingMonthOf(at.value),
          { at: at.value, postId: post.id }
        );

        yield* before >= allowed.value ? overPlan : Effect.void;
      }
    });

    const outgoing = Effect.fn("Publishing.outgoing")(function* outgoing(
      request: PublishRequest
    ) {
      const { stored, target } = yield* Effect.all({
        stored: posts.find(request.postId),
        target: posts.findTarget(request.targetId),
      }).pipe(Effect.catchTag("DatabaseError", databaseDown));

      if (Option.isNone(stored)) {
        return yield* Effect.die(`Post ${request.postId} is missing`);
      }

      if (Option.isNone(target)) {
        return yield* Effect.die(`Target ${request.targetId} is missing`);
      }

      const account = yield* credentials.account(request.channelId);
      const client = clients.for(account.platform);

      if (Option.isNone(client)) {
        return yield* new BadRequest({ code: "platformNotSupported" });
      }

      const { post } = stored.value;
      const part = partsOn(post.content, request.channelId)[request.part];

      // The post has fewer parts than the job was started for: it cannot
      // have changed since it was scheduled.
      if (part === undefined) {
        return yield* Effect.die(
          `Post ${request.postId} has no part ${String(request.part)}`
        );
      }

      // Scheduling refuses parts where the platform, the format the
      // options choose there, or the channel's way in (a LinkedIn
      // profile) takes a post alone; a part that came this
      // far all the same must never go out as a post of its own.
      if (
        part.index > 0 &&
        (followUpsThrough(
          account.platform,
          account.connection,
          target.value.options
        ) === undefined ||
          !threaded.takesParts(account.platform))
      ) {
        return yield* new BadRequest({
          code: ownRefusalCodes.partsNotSupported,
        });
      }

      // A post with a first comment where this server no longer sends
      // comments (its operator took the platform out of
      // PEAL_INBOX_PLATFORMS since it was scheduled) is refused before
      // anything goes out: never a post whose comment then cannot follow.
      if (
        part.index === 0 &&
        post.content.followUps.length > 0 &&
        followUpsThrough(
          account.platform,
          account.connection,
          target.value.options
        )?.kind === "comment" &&
        !threaded.takesParts(account.platform)
      ) {
        return yield* new BadRequest({ code: firstCommentsOff });
      }

      // A post with a first comment: the target is marked so when its post
      // goes out, so the post counts as live once it is, whatever becomes
      // of the comment, even if the comment is never sent.
      if (
        (part.index > 0 || post.content.followUps.length > 0) &&
        followUpsThrough(
          account.platform,
          account.connection,
          target.value.options
        )?.kind === "comment"
      ) {
        yield* posts
          .markFirstComment(request.targetId)
          .pipe(Effect.catchTag("DatabaseError", databaseDown));
      }

      // Scheduling refuses a poll where Peal sends none; one that came
      // this far all the same must never go out without it.
      const poll = part.index === 0 ? post.content.poll : Option.none();

      if (
        Option.isSome(poll) &&
        rulesFor(account.platform, target.value.options).poll === undefined
      ) {
        return yield* new BadRequest({ code: pollNotSupported });
      }

      const sent: OutgoingPost = {
        accountId: account.accountId,
        channelId: request.channelId,
        idempotencyKey: request.idempotencyKey,
        media: part.media,
        options: target.value.options,
        part: part.index,
        poll,
        replyTo: yield* replyTargetOf(target.value, part.index),
        startedAt: request.startedAt,
        text: yield* textSent(post, request, account.platform, part.text),
        workspaceId: post.workspaceId,
      };

      return {
        client: client.value,
        platform: account.platform,
        post: sent,
        stored: post,
        thread: {
          live: target.value.liveParts.length,
          texts: partsOn(post.content, request.channelId).map(
            ({ text }) => text
          ),
        },
      };
    });

    return PlatformPublisher.of({
      publish: (request) =>
        outgoing(request).pipe(
          Effect.tap(({ post, stored }) =>
            post.part === 0
              ? withinPlan(stored).pipe(
                  Effect.catchTag("DatabaseError", databaseDown)
                )
              : Effect.void
          ),
          Effect.flatMap(({ client, platform, post, thread }) =>
            sendMetered(client, post, platform, thread)
          ),
          storable
        ),
      // Without the post or its channel, the earlier run cannot be checked.
      resume: (request) =>
        outgoing(request).pipe(
          Effect.matchEffect({
            onFailure: () => Effect.succeed(interrupted),
            onSuccess: ({ client, post }) => client.resume(post),
          }),
          storable
        ),
    });
  })
);
