import { Option, Schema } from "effect";
import type { DateTime } from "effect";

import { ChannelIdSchema, WorkspaceIdSchema } from "#shared/domain/ids.ts";
import type { ChannelId, WorkspaceId } from "#shared/domain/ids.ts";
import { PlatformSchema } from "#shared/domain/platform.ts";
import type { Platform } from "#shared/domain/platform.ts";

import { PostContent } from "./post-content.ts";
import { PostPart } from "./post-part.ts";
import { isWithoutNul, maxPostTextLength } from "./post-text.ts";
import { SignatureIdSchema } from "./signature-id.ts";
import type { SignatureId } from "./signature-id.ts";
import { TextOverride } from "./text-override.ts";

/** The longest name a signature has. */
export const maxSignatureNameLength = 60;

/** The longest text a signature adds to a post. */
export const maxSignatureLength = 2000;

/** The most signatures a workspace keeps. */
export const maxSignaturesPerWorkspace = 50;

const isTrimmed = Schema.makeFilter((text: string) => text === text.trim(), {
  expected: "text without spaces around it",
});

/** A signature's name: a short line, to tell it from the others. */
export const SignatureNameSchema = Schema.String.check(
  Schema.isBetweenLength(1, maxSignatureNameLength),
  isTrimmed,
  Schema.makeFilter((name: string) => !/\p{Cc}/u.test(name), {
    expected: "a name on one line, without control characters",
  })
);

/** What a signature adds to a post: plain text, as a post's own. */
export const SignatureTextSchema = Schema.String.check(
  Schema.isBetweenLength(1, maxSignatureLength),
  isTrimmed,
  isWithoutNul
);

/**
 * Where a signature is meant for: every channel of the workspace, those of
 * one platform, or one channel.
 */
export const SignatureScopeSchema = Schema.Union([
  Schema.TaggedStruct("workspace", {}),
  Schema.TaggedStruct("platform", { platform: PlatformSchema }),
  Schema.TaggedStruct("channel", { channelId: ChannelIdSchema }),
]);

export type SignatureScope = typeof SignatureScopeSchema.Type;

/**
 * A block of text a workspace keeps to end its posts with: a sign-off, a
 * disclosure, a set of hashtags. Workspace content, written by its members
 * for the platforms' public.
 *
 * A default signature is added to new posts that ask for the defaults:
 * one at most is the default of each scope.
 */
export class Signature extends Schema.Class<Signature>(
  "peal-server/publishing/domain/Signature"
)({
  createdAt: Schema.DateTimeUtc,
  id: SignatureIdSchema,
  isDefault: Schema.Boolean,
  name: SignatureNameSchema,
  scope: SignatureScopeSchema,
  text: SignatureTextSchema,
  workspaceId: WorkspaceIdSchema,
}) {}

/** What a member writes of a signature. */
export interface SignatureDetails {
  readonly isDefault: boolean;
  readonly name: string;
  readonly scope: SignatureScope;
  readonly text: string;
}

export const createSignature = (
  id: SignatureId,
  workspaceId: WorkspaceId,
  details: SignatureDetails,
  now: DateTime.Utc
): Signature => new Signature({ ...details, createdAt: now, id, workspaceId });

export const editSignature = (
  signature: Signature,
  details: SignatureDetails
): Signature =>
  new Signature({
    ...details,
    createdAt: signature.createdAt,
    id: signature.id,
    workspaceId: signature.workspaceId,
  });

/** What two scopes are compared by: a scope has one default. */
export const scopeKeyOf = (scope: SignatureScope): string => {
  if (scope._tag === "platform") {
    return `platform:${scope.platform}`;
  }

  return scope._tag === "channel" ? `channel:${scope.channelId}` : "workspace";
};

// What a signature's text is compared by: composed alike, whatever the
// spaces a text ends with.
const settled = (text: string) => text.normalize("NFC").trimEnd();

/** Whether the text already ends with the signature. */
export const isSigned = (text: string, signature: string): boolean =>
  settled(text).endsWith(settled(signature));

/**
 * The text with the signature under it, a blank line between them. A text
 * that already ends with it stays as it is, so a signature is never added
 * twice, and an empty text is the signature alone. A text too long to
 * keep with it (`maxPostTextLength`, far above what any platform takes)
 * stays as it is too.
 */
export const signed = (text: string, signature: string): string => {
  if (isSigned(text, signature)) {
    return text;
  }

  const body = text.trimEnd();
  const whole = body === "" ? signature : `${body}\n\n${signature}`;

  return whole.length > maxPostTextLength ? text : whole;
};

/** The text without the signature it ends with, if it ends with it. */
export const unsigned = (text: string, signature: string): string =>
  isSigned(text, signature)
    ? settled(text).slice(0, -settled(signature).length).trimEnd()
    : text;

/** A channel a signature may be meant for. */
export interface SignedChannel {
  readonly channelId: ChannelId;
  readonly platform: Platform;
}

/**
 * The default signature of a channel: its own, else its platform's, else
 * the workspace's.
 */
export const defaultFor = (
  signatures: readonly Signature[],
  { channelId, platform }: SignedChannel
): Option.Option<Signature> => {
  const defaults = signatures.filter(({ isDefault }) => isDefault);

  const scoped = (matches: (scope: SignatureScope) => boolean) =>
    Option.fromUndefinedOr(defaults.find(({ scope }) => matches(scope)));

  return scoped(
    (scope) => scope._tag === "channel" && scope.channelId === channelId
  ).pipe(
    Option.orElse(() =>
      scoped(
        (scope) => scope._tag === "platform" && scope.platform === platform
      )
    ),
    Option.orElse(() => scoped((scope) => scope._tag === "workspace"))
  );
};

/** The texts of the part a signature goes under. */
interface SignedPart {
  readonly overrides: readonly TextOverride[];
  readonly text: string;
}

/**
 * The part a signature goes under: the last, the post itself when it has
 * no other.
 */
const lastPartOf = (content: PostContent): SignedPart =>
  content.followUps.at(-1) ?? content;

/** The content with the last part's texts replaced, every other kept. */
const withLastPart = (
  content: PostContent,
  { overrides, text }: SignedPart
): PostContent => {
  const last = content.followUps.at(-1);

  return last === undefined
    ? new PostContent({ media: content.media, overrides, text })
    : new PostContent({
        followUps: [
          ...content.followUps.slice(0, -1),
          new PostPart({
            delaySeconds: last.delaySeconds,
            media: last.media,
            overrides,
            text,
          }),
        ],
        media: content.media,
        overrides: content.overrides,
        text: content.text,
      });
};

/**
 * The content with one signature under its text, and under the text it has
 * instead on each channel: what inserting a signature by hand does.
 *
 * A post in several parts is signed under its last part.
 */
export const withSignature = (
  content: PostContent,
  signature: Signature
): PostContent => {
  const last = lastPartOf(content);

  return withLastPart(content, {
    overrides: last.overrides.map(
      ({ channelId, text }) =>
        new TextOverride({ channelId, text: signed(text, signature.text) })
    ),
    text: signed(last.text, signature.text),
  });
};

/**
 * The content with the default signatures of its channels: the
 * workspace's under its text, and, on a channel whose own default or
 * platform's default is another, that one under the text the channel has
 * instead (its override, or one made for it from the post's text). Applied
 * again, it changes nothing.
 *
 * A post in several parts is signed under its last part.
 */
export const withDefaultSignatures = (
  content: PostContent,
  channels: readonly SignedChannel[],
  signatures: readonly Signature[]
): PostContent => {
  const general = Option.fromUndefinedOr(
    signatures.find(
      ({ isDefault, scope }) => isDefault && scope._tag === "workspace"
    )
  );

  // The post's own words, without the workspace's signature under them.
  const plain = (text: string) =>
    Option.match(general, {
      onNone: () => text,
      onSome: (signature) => unsigned(text, signature.text),
    });

  const last = lastPartOf(content);

  const overridden = new Map(
    last.overrides.map(({ channelId, text }) => [channelId, text])
  );

  const known = new Set<ChannelId>(channels.map(({ channelId }) => channelId));

  const onChannels = channels.flatMap((channel) => {
    const own = defaultFor(signatures, channel);
    const written = Option.fromUndefinedOr(overridden.get(channel.channelId));

    // No default here, or the workspace's and no text of its own: the
    // channel takes the post's text, signed below.
    if (
      Option.isNone(own) ||
      (Option.isNone(written) && own.value.scope._tag === "workspace")
    ) {
      return Option.match(written, {
        onNone: () => [],
        onSome: (text) => [
          new TextOverride({ channelId: channel.channelId, text }),
        ],
      });
    }

    const base = Option.getOrElse(written, () => last.text);

    return [
      new TextOverride({
        channelId: channel.channelId,
        text: signed(
          own.value.scope._tag === "workspace" ? base : plain(base),
          own.value.text
        ),
      }),
    ];
  });

  // The texts of channels the post is not for yet stay as they are.
  const others = last.overrides.filter(
    ({ channelId }) => !known.has(channelId)
  );

  return withLastPart(content, {
    overrides: [...onChannels, ...others],
    text: Option.match(general, {
      onNone: () => last.text,
      onSome: (signature) => signed(last.text, signature.text),
    }),
  });
};
