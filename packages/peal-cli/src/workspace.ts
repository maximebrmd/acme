import type { Membership } from "acme-contract";
import { Config, Effect, Option } from "effect";
import { Flag } from "effect/cli";

import { AcmeApi } from "#api.ts";
import { display } from "#display.ts";
import { explain } from "#explain.ts";
import { channelName } from "#print.ts";
import { Refused } from "#refused.ts";
import { accessToken } from "#session.ts";
import { SignInExpired } from "#sign-in-expired.ts";

/** The workspace a command acts in: a flag, then ACME_WORKSPACE. */
export const workspaceFlag = Flag.String("workspace").pipe(
  Flag.withAlias("w"),
  Flag.withDescription(
    "The workspace to act in, by its slug or id. Defaults to ACME_WORKSPACE, then to your only workspace."
  ),
  Flag.withMetavar("<slug>"),
  Flag.withFallbackConfig(Config.String("ACME_WORKSPACE")),
  Flag.optional
);

/**
 * The HTTP API's client, signed in as the user, for the server the command
 * line points at.
 */
export const signedIn = Effect.gen(function* signedIn() {
  const api = yield* AcmeApi;
  const url = display(api.baseUrl);

  return { client: yield* api.signedIn(yield* accessToken), url };
});

const pick = (
  workspaces: readonly Membership[],
  choice: Option.Option<string>
): Effect.Effect<Membership, Refused> =>
  Option.match(choice, {
    onNone: () => {
      const [only] = workspaces;

      if (only !== undefined && workspaces.length === 1) {
        return Effect.succeed(only);
      }

      return Effect.fail(
        new Refused({
          reason:
            only === undefined
              ? "You do not belong to any workspace yet."
              : `You belong to several workspaces: name one with --workspace or ACME_WORKSPACE (${workspaces.map(({ slug }) => slug).join(", ")}).`,
        })
      );
    },
    onSome: (wanted) =>
      Option.match(
        Option.fromUndefinedOr(
          workspaces.find(({ id, slug }) => id === wanted || slug === wanted)
        ),
        {
          onNone: () =>
            Effect.fail(
              new Refused({
                reason: `You belong to no workspace ${wanted}. acme whoami lists yours.`,
              })
            ),
          onSome: Effect.succeed,
        }
      ),
  });

/**
 * The signed-in client, and the workspace a command acts in: the one the
 * user named, by slug or id, or their only one.
 */
export const inWorkspace = (choice: Option.Option<string>) =>
  Effect.gen(function* signedInWorkspace() {
    const { client, url } = yield* signedIn;

    const me = yield* client.session.me().pipe(
      Effect.mapError((failure) =>
        // The sign-in was revoked, or its user banned.
        failure._tag === "Forbidden"
          ? new SignInExpired({ url })
          : explain(url)(failure)
      )
    );

    const workspace = yield* pick(me.workspaces, choice);

    return { client, url, workspace };
  });

type SignedInClient = Effect.Success<typeof signedIn>["client"];

/**
 * The workspace's channels by id, as people recognize them, to print beside
 * their ids. A member who may not read them sees the ids alone.
 */
export const channelNames = (client: SignedInClient, workspaceId: string) =>
  client.channels.list({ params: { workspaceId } }).pipe(
    Effect.map(
      (channels): ReadonlyMap<string, string> =>
        new Map(channels.map((channel) => [channel.id, channelName(channel)]))
    ),
    Effect.orElseSucceed((): ReadonlyMap<string, string> => new Map())
  );

/** A channel's id, with its name when it is known. */
export const named = (
  names: ReadonlyMap<string, string>,
  channelId: string
): string => {
  const name = names.get(channelId);

  return name === undefined ? channelId : `${channelId} (${name})`;
};
