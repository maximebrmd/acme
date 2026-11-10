import { Effect, Match, Option } from "effect";
import { Flag } from "effect/cli";
import { maxChannelSetsPerPost } from "peal-contract";
import type { ChannelSet, PostWarning, Signature } from "peal-contract";

import { explain } from "#explain.ts";
import { Refused } from "#refused.ts";
import type { inWorkspace } from "#workspace.ts";

type InWorkspace = Effect.Success<ReturnType<typeof inWorkspace>>;

// What a workspace saves under a name no other of its kind has.
interface Saved {
  readonly id: string;
  readonly name: string;
}

// The saved item a command names: by its id, or by its exact name, whatever
// its case.
const savedNamed = <A extends Saved>(
  kept: readonly A[],
  given: string,
  unknown: (wanted: string) => Refused
): Effect.Effect<A, Refused> => {
  const wanted = given.trim();
  const name = wanted.toLowerCase();

  return Option.match(
    Option.fromUndefinedOr(
      kept.find(({ id }) => id === wanted) ??
        kept.find((saved) => saved.name.toLowerCase() === name)
    ),
    {
      onNone: () => Effect.fail(unknown(wanted)),
      onSome: (saved) => Effect.succeed(saved),
    }
  );
};

/** The workspace's signatures, oldest first. */
export const signaturesOf = ({ client, url, workspace }: InWorkspace) =>
  client.signatures
    .list({ params: { workspaceId: workspace.id } })
    .pipe(Effect.mapError(explain(url)));

/**
 * The signature a command names: by its id, or by its exact name, whatever
 * its case. A workspace has no two signatures of one name.
 */
export const signatureNamed = (
  signatures: readonly Signature[],
  given: string
): Effect.Effect<Signature, Refused> =>
  savedNamed(
    signatures,
    given,
    (wanted) =>
      new Refused({
        code: "signature_unknown",
        reason: `The workspace has no signature ${wanted}, by id or by name: peal signatures list shows them.`,
      })
  );

/** The signature a command names, looked up among the workspace's. */
export const findSignature = (session: InWorkspace, given: string) =>
  signaturesOf(session).pipe(
    Effect.flatMap((signatures) => signatureNamed(signatures, given))
  );

/** The workspace's channel sets, oldest first. */
export const setsOf = ({ client, url, workspace }: InWorkspace) =>
  client.channelSets
    .list({ params: { workspaceId: workspace.id } })
    .pipe(Effect.mapError(explain(url)));

/**
 * The channel set a command names: by its id, or by its exact name,
 * whatever its case. A workspace has no two sets of one name.
 */
export const setNamed = (
  sets: readonly ChannelSet[],
  given: string
): Effect.Effect<ChannelSet, Refused> =>
  savedNamed(
    sets,
    given,
    (wanted) =>
      new Refused({
        code: "channel_set_unknown",
        reason: `The workspace has no channel set ${wanted}, by id or by name: peal sets list shows them.`,
      })
  );

/** The channel set a command names, looked up among the workspace's. */
export const findSet = (session: InWorkspace, given: string) =>
  setsOf(session).pipe(Effect.flatMap((sets) => setNamed(sets, given)));

/** `--set <id-or-name>`, repeated: the channel sets a post goes to. */
export const setsFlag = (description: string) =>
  Flag.String("set").pipe(
    Flag.withMetavar("<id-or-name>"),
    Flag.withDescription(description),
    Flag.atLeast(0)
  );

/** `--signature <id-or-name>`: a signature to put under a post's text. */
export const signatureFlag = (description: string) =>
  Flag.String("signature").pipe(
    Flag.withMetavar("<id-or-name>"),
    Flag.withDescription(description),
    Flag.optional
  );

/** `--default-signatures`: each channel's default signature under its text. */
export const defaultSignaturesFlag = (description: string) =>
  Flag.Boolean("default-signatures").pipe(
    Flag.withDescription(description),
    Flag.withDefault(false)
  );

/** What a post asks of what its workspace saved, as its request says it. */
export interface Presets {
  readonly channelSets?: readonly string[];
  readonly defaultSignatures?: boolean;
  readonly signatureId?: string;
}

/**
 * What `--set`, `--default-signatures` and `--signature` ask, as a post's
 * request says it: the sets and the signature by id, each looked up among
 * the workspace's, so one it lacks is refused before anything is stored or
 * made. What no flag asks is left out, and asks the server nothing.
 */
export const presetsOf = (
  session: InWorkspace,
  given: {
    readonly defaultSignatures: boolean;
    readonly sets: readonly string[];
    readonly signature: Option.Option<string>;
  }
) =>
  Effect.gen(function* asking() {
    const named: string[] = [];

    if (given.sets.length > 0) {
      const sets = yield* setsOf(session);

      for (const wanted of given.sets) {
        const { id } = yield* setNamed(sets, wanted);

        if (!named.includes(id)) {
          named.push(id);
        }
      }
    }

    if (named.length > maxChannelSetsPerPost) {
      return yield* new Refused({
        reason: `A post names ${String(maxChannelSetsPerPost)} channel sets at most.`,
      });
    }

    const signature = yield* Effect.transposeOption(
      given.signature.pipe(
        Option.map((wanted) => findSignature(session, wanted))
      )
    );

    const fromSets = named.length === 0 ? {} : { channelSets: named };
    const defaults = given.defaultSignatures ? { defaultSignatures: true } : {};

    const presets: Presets = {
      ...fromSets,
      ...defaults,
      ...Option.match(signature, {
        onNone: () => ({}),
        onSome: ({ id }) => ({ signatureId: id }),
      }),
    };

    return presets;
  });

/**
 * What an answer warns of, one line each, as people read it: the channels
 * of a set the post named that are no longer connected, which the post was
 * made without (`made`), or would be.
 */
export const warningLines = (
  warnings: readonly PostWarning[] | undefined,
  made: boolean
): string[] =>
  (warnings ?? []).map((warning) =>
    Match.valueTags(warning, {
      channelsDropped: ({ channelIds, channelSetName }) => {
        const one = channelIds.length === 1;

        return `The channel set ${channelSetName} names ${String(channelIds.length)} ${one ? "channel that is" : "channels that are"} no longer connected, which the post ${made ? "was" : "would be"} made without: ${channelIds.join(", ")}. peal sets update takes ${one ? "it" : "them"} out of the set.`;
      },
    })
  );
