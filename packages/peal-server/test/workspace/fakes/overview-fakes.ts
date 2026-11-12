import { DateTime, Effect, Layer, Option, Ref } from "effect";

import type { Actor } from "#shared/domain/access.ts";
import { UserIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { WorkspaceId } from "#shared/domain/ids.ts";
import { MemberDirectory } from "#workspace/application/member-directory.ts";
import { OverviewSources } from "#workspace/application/overview-sources.ts";
import type {
  AgendaEntry,
  AgendaRequest,
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
export const figures = {
  channels: { connected: 4, off: 1, toReconnect: 2 },
  posts: {
    awaitingApproval: 3,
    failedLast7Days: 1,
    scheduledNext7Days: 5,
    unconfirmedLast7Days: 2,
  },
  unanswered: 7,
};

export interface Calls {
  readonly agenda: AgendaRequest[];
  readonly channels: (readonly WorkspaceId[])[];
  readonly overPlan: WorkspaceId[];
  readonly posts: (readonly WorkspaceId[])[];
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
    overPlan: (actor: Actor) =>
      record((current) => ({
        ...current,
        overPlan: [...current.overPlan, actor.workspaceId],
      })).pipe(Effect.as(actor.workspaceId === bravo)),
    posts: (ids) =>
      record((current) => ({
        ...current,
        posts: [...current.posts, ids],
      })).pipe(Effect.as(mapOf(ids, figures.posts))),
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
    unanswered: [],
  });

export const firstPage = { cursor: Option.none(), limit: 50 };
