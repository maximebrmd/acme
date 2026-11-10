import { Option, Schema } from "effect";
import { PlatformSchema, SignatureDetailsSchema } from "peal-contract";
import type {
  Platform,
  Signature,
  SignatureDetails,
  SignatureScope,
} from "peal-contract";

// A signature as its form holds it, and what the form would save.

export const ScopeKindSchema = Schema.Literals([
  "workspace",
  "platform",
  "channel",
]);

export type ScopeKind = typeof ScopeKindSchema.Type;

const decodePlatform = Schema.decodeUnknownOption(PlatformSchema);

/** The platform a select named, if it named one. */
export const platformOf = (value: string | null): Option.Option<Platform> =>
  decodePlatform(value);

/**
 * The form's fields. The platform and the channel are kept while another
 * kind of scope is chosen, so going back finds them.
 */
export interface SignatureDraft {
  /** The channel of a channel's signature; empty until one is chosen. */
  readonly channelId: string;
  readonly isDefault: boolean;
  readonly name: string;
  /** The platform of a platform's signature; none until one is chosen. */
  readonly platform: Platform | undefined;
  readonly scope: ScopeKind;
  readonly text: string;
}

export const emptySignatureDraft: SignatureDraft = {
  channelId: "",
  isDefault: false,
  name: "",
  platform: undefined,
  scope: "workspace",
  text: "",
};

/** The form of a signature the workspace keeps. */
export const signatureDraftOf = (signature: Signature): SignatureDraft => ({
  channelId:
    signature.scope._tag === "channel" ? signature.scope.channelId : "",
  isDefault: signature.isDefault,
  name: signature.name,
  platform:
    signature.scope._tag === "platform" ? signature.scope.platform : undefined,
  scope: signature.scope._tag,
  text: signature.text,
});

const scopeOf = ({
  channelId,
  platform,
  scope,
}: SignatureDraft): Option.Option<SignatureScope> => {
  if (scope === "workspace") {
    return Option.some({ _tag: "workspace" });
  }

  if (scope === "platform") {
    return Option.fromUndefinedOr(platform).pipe(
      Option.map((chosen): SignatureScope => ({
        _tag: "platform",
        platform: chosen,
      }))
    );
  }

  return channelId === ""
    ? Option.none()
    : Option.some({ _tag: "channel", channelId });
};

const decodeDetails = Schema.decodeUnknownOption(SignatureDetailsSchema);

/**
 * What the form would save, if the API would take it: a name, a text
 * within the limit, and a scope that names its platform or its channel.
 */
export const signatureDetailsOf = (
  draft: SignatureDraft
): Option.Option<SignatureDetails> =>
  scopeOf(draft).pipe(
    Option.flatMap((scope) =>
      decodeDetails({
        isDefault: draft.isDefault,
        name: draft.name.trim(),
        scope,
        text: draft.text.trim(),
      })
    )
  );

/** The signatures new posts take when they ask for the defaults. */
export const defaultSignatures = (
  signatures: readonly Signature[]
): readonly Signature[] => signatures.filter(({ isDefault }) => isDefault);
