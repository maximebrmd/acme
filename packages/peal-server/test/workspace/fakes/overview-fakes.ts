import { DateTime, Effect, Layer, Option, Ref } from "effect";

import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { LocalDateSchema } from "#shared/domain/wall-clock.ts";
import { MemberDirectory } from "#workspace/application/member-directory.ts";
import { OverviewSources } from "#workspace/application/overview-sources.ts";
import type {
  AgendaEntry,
  AgendaRequest,
  ReportTotals,
} from "#workspace/application/overview-sources.ts";
import { Overview } from "#workspace/application/overview.ts";
import { PartnerOwnership } from "#workspace/application/partner-ownership.ts";
import { ResolveMember } from "#workspace/application/resolve-member.ts";
import { Account } from "#workspace/domain/account.ts";
import type { Membership } from "#workspace/domain/membership.ts";
import { UserPrincipal } from "#workspace/domain/user-principal.ts";

// The overview over a directory and sources in memory, for the tests of
// its use case and of its endpoints.

// Synthetic workspaces and people; none of these ids exists anywhere.
export const alpha = WorkspaceIdSchema.make(
  "0a1b2c3d-0000-4000-8000-00000000000a"
);

export const bravo = WorkspaceIdSchema.make(
  "0a1b2c3d-0000-4000-8000-00000000000b"
);

export const charlie = WorkspaceIdSchema.make(
  "0a1b2c3d-0000-4000-8000-00000000000c"
);

export const userId = UserIdSchema.make("0a1b2c3d-0000-4000-8000-0000000000f1");

export const staffId = UserIdSchema.make(
  "0a1b2c3d-0000-4000-8000-0000000000f2"
);

export const person = new UserPrincipal({
  impersonatedBy: Option.none(),
  userId,
});

const noTwoStep = { enabled: false, required: false };

export interface Place {
  readonly id: WorkspaceId;
  readonly name: string;
  readonly role: string;
  readonly twoStepRequired?: boolean;
}

export const at = (iso: string) => DateTime.makeUnsafe(iso);

// The figures every source answers, for the workspaces named.
const reportTotals = (posts: number): ReportTotals => ({
  clicks: Option.none(),
  engagement: posts * 4,
  impressions: Option.some(posts * 100),
  likes: posts * 3,
  posts,
  quotes: Option.none(),
  reach: Option.none(),
  replies: 0,
  reposts: posts,
  saves: Option.none(),
});

export const figures = {
  channels: { connected: 4, off: 1, toReconnect: 2 },
  posts: {
    awaitingApproval: 3,
    failedLast7Days: 1,
    scheduledNext7Days: 5,
    unconfirmedLast7Days: 2,
  },
  report: {
    followers: { current: Option.some(120), gained: Option.some(20) },
    previousFollowers: { current: Option.some(100), gained: Option.none() },
    previousKept: true,
    previousTotals: reportTotals(3),
    totals: reportTotals(5),
  },
  unanswered: 7,
};

/** The range every report of the fake covers: 1 to 7 November 2026. */
export const reportDays = {
  from: LocalDateSchema.make({ day: 1, month: 11, year: 2026 }),
  to: LocalDateSchema.make({ day: 7, month: 11, year: 2026 }),
};

export interface Calls {
  readonly agenda: AgendaRequest[];
  readonly channels: (readonly WorkspaceId[])[];
  readonly overPlan: (readonly WorkspaceId[])[];
  readonly posts: (readonly WorkspaceId[])[];
  readonly report: (readonly WorkspaceId[])[];
  readonly unanswered: (readonly WorkspaceId[])[];
}

const mapOf = <A>(ids: readonly WorkspaceId[], value: A) =>
  new Map(ids.map((id) => [id, value] as const));

/**
 * The overview over a directory that holds `places` for the person, with
 * `banned` set when staff banned them, and sources that answer the same
 * figures for every workspace they are asked about, and `entries` for the
 * agenda, recording each call.
 */
export const overviewOver = (
  places: readonly Place[],
  calls: Ref.Ref<Calls>,
  options: {
    readonly banned?: boolean;
    readonly entries?: readonly AgendaEntry[];
  } = {}
) => {
  const ban =
    options.banned === true
      ? Option.some({ expiresAt: Option.none() })
      : Option.none();

  const membershipOf = (workspaceId: WorkspaceId) =>
    Option.fromUndefinedOr(places.find(({ id }) => id === workspaceId)).pipe(
      Option.map((place): Membership => ({
        ban,
        role: place.role,
        twoStep: { ...noTwoStep, required: place.twoStepRequired === true },
      }))
    );

  const directory = MemberDirectory.of({
    account: () =>
      Effect.succeed(
        Option.some(
          new Account({
            ban,
            email: "someone@example.test",
            emailVerified: true,
            id: userId,
            image: Option.none(),
            locale: "en",
            name: "Someone",
            twoStepEnabled: false,
            workspaces: places.map(({ id, name, role }) => ({
              id,
              name,
              role,
              slug: name.toLowerCase(),
            })),
          })
        )
      ),
    membership: (_, workspaceId) =>
      Effect.succeed(
        Option.fromUndefinedOr(
          places.find(({ id }) => id === workspaceId)
        ).pipe(
          Option.map((place): Membership => ({
            ban,
            role: place.role,
            twoStep: {
              ...noTwoStep,
              required: place.twoStepRequired === true,
            },
          }))
        )
      ),
    memberships: (_, ids) =>
      Effect.succeed(
        new Map(
          ids.flatMap((id) =>
            Option.match(membershipOf(id), {
              onNone: () => [],
              onSome: (found) => [[id, found] as const],
            })
          )
        )
      ),
  });

  const record = (change: (current: Calls) => Calls) =>
    Ref.update(calls, change);

  const sources = OverviewSources.of({
    agenda: (request) =>
      record((current) => ({
        ...current,
        agenda: [...current.agenda, request],
      })).pipe(Effect.as(options.entries ?? [])),
    channels: (ids) =>
      record((current) => ({
        ...current,
        channels: [...current.channels, ids],
      })).pipe(Effect.as(mapOf(ids, figures.channels))),
    overPlan: (ids) =>
      record((current) => ({
        ...current,
        overPlan: [...current.overPlan, ids],
      })).pipe(Effect.as(new Set(ids.filter((id) => id === bravo)))),
    posts: (ids) =>
      record((current) => ({
        ...current,
        posts: [...current.posts, ids],
      })).pipe(Effect.as(mapOf(ids, figures.posts))),
    report: (actors) =>
      record((current) => ({
        ...current,
        report: [
          ...current.report,
          actors.map(({ workspaceId }) => workspaceId),
        ],
      })).pipe(
        Effect.as({
          previous: reportDays,
          range: reportDays,
          workspaces: new Map(
            actors.map(({ workspaceId }) => [workspaceId, figures.report])
          ),
        })
      ),
    unanswered: (ids) =>
      record((current) => ({
        ...current,
        unanswered: [...current.unanswered, ids],
      })).pipe(Effect.as(mapOf(ids, figures.unanswered))),
  });

  return Overview.layer.pipe(
    Layer.provide(ResolveMember.layer),
    Layer.provide(
      Layer.mergeAll(
        Layer.succeed(MemberDirectory, directory),
        Layer.succeed(OverviewSources, sources),
        PartnerOwnership.layerNone
      )
    )
  );
};

export const noCalls = (): Effect.Effect<Ref.Ref<Calls>> =>
  Ref.make<Calls>({
    agenda: [],
    channels: [],
    overPlan: [],
    posts: [],
    report: [],
    unanswered: [],
  });

export const firstPage = { cursor: Option.none(), limit: 50 };
