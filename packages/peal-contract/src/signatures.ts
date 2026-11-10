import { Schema } from "effect";
import {
  HttpApiEndpoint,
  HttpApiGroup,
  HttpApiSchema,
  OpenApi,
} from "effect/http-api";

import { Authentication } from "./authentication.ts";
import { Forbidden } from "./forbidden.ts";
import { PlatformSchema } from "./platform.ts";
import { SignatureNameTaken } from "./signature-name-taken.ts";
import { SignatureNotFound } from "./signature-not-found.ts";
import { TooManySignatures } from "./too-many-signatures.ts";
import { UnknownChannels } from "./unknown-channels.ts";
import { WorkspaceAccess } from "./workspace-access.ts";

/** The longest name a signature has. */
export const maxSignatureNameLength = 60;

/** The longest text a signature adds to a post. */
export const maxSignatureLength = 2000;

/** The most signatures a workspace keeps. */
export const maxSignaturesPerWorkspace = 50;

const isTrimmed = Schema.makeFilter((text: string) => text === text.trim(), {
  expected: "text without spaces around it",
});

const nul = String.fromCodePoint(0);

/**
 * Where a signature is meant for: every channel of the workspace, those of
 * one platform, or one channel.
 */
export const SignatureScopeSchema = Schema.Union([
  Schema.TaggedStruct("workspace", {}),
  Schema.TaggedStruct("platform", { platform: PlatformSchema }),
  Schema.TaggedStruct("channel", { channelId: Schema.String }),
]).annotate({ identifier: "SignatureScope" });

export type SignatureScope = typeof SignatureScopeSchema.Type;

/** A block of text a workspace keeps to end its posts with. */
export const SignatureSchema = Schema.Struct({
  createdAt: Schema.DateTimeUtc,
  id: Schema.String,
  // Whether new posts that ask for the defaults take it, in its scope.
  isDefault: Schema.Boolean,
  name: Schema.String,
  scope: SignatureScopeSchema,
  text: Schema.String,
}).annotate({ identifier: "Signature" });

export type Signature = typeof SignatureSchema.Type;

/** A signature, as a member writes it. */
export const SignatureDetailsSchema = Schema.Struct({
  // Left out, it is no default.
  isDefault: Schema.optionalKey(Schema.Boolean),
  name: Schema.String.check(
    Schema.isBetweenLength(1, maxSignatureNameLength),
    isTrimmed,
    Schema.makeFilter((name: string) => !/\p{Cc}/u.test(name), {
      expected: "a name on one line, without control characters",
    })
  ),
  // Left out, the whole workspace.
  scope: Schema.optionalKey(SignatureScopeSchema),
  text: Schema.String.check(
    Schema.isBetweenLength(1, maxSignatureLength),
    isTrimmed,
    Schema.makeFilter((text: string) => !text.includes(nul), {
      expected: "text without NUL characters",
    })
  ),
}).annotate({ identifier: "SignatureDetails" });

export type SignatureDetails = typeof SignatureDetailsSchema.Type;

// What a signature's text is compared by: composed alike, whatever the
// spaces a text ends with.
const settled = (value: string) => value.normalize("NFC").trimEnd();

/**
 * The text with the signature under it, a blank line between them, as the
 * server writes it: a text that already ends with the signature stays as
 * it is, so a signature is never added twice. For clients that insert one
 * while a post is written.
 */
export const signedText = (text: string, signature: string): string => {
  if (settled(text).endsWith(settled(signature))) {
    return text;
  }

  const body = text.trimEnd();

  return body === "" ? signature : `${body}\n\n${signature}`;
};

const workspace = { workspaceId: Schema.String };

const signature = { ...workspace, signatureId: Schema.String };

/** A workspace's signatures: the text it ends its posts with. */
export class SignaturesApi extends HttpApiGroup.make("signatures")
  .add(
    HttpApiEndpoint.get("list", "/", {
      error: Forbidden,
      params: workspace,
      success: Schema.Array(SignatureSchema),
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Lists the workspace's signatures, oldest first. Needs post:read.",
        summary: "List signatures",
      })
    ),
    HttpApiEndpoint.post("create", "/", {
      error: [
        Forbidden,
        SignatureNameTaken,
        TooManySignatures,
        UnknownChannels,
      ],
      params: workspace,
      payload: SignatureDetailsSchema,
      success: SignatureSchema.pipe(HttpApiSchema.status(201)),
    }).annotateMerge(
      OpenApi.annotations({
        description: `Adds a signature to the workspace: a name no other signature of the workspace has whatever its case, a text of ${maxSignatureLength} characters at most, and the \`scope\` it is meant for (the whole \`workspace\`, a \`platform\`, or one \`channel\` of the workspace). With \`isDefault\`, new posts that ask for the default signatures take it in its scope, and the signature that was the default of that scope is one no longer. A signature is text of the post once added: it counts against each platform's limit when the post is scheduled. A workspace keeps ${maxSignaturesPerWorkspace} signatures at most. Needs post:update, and channel:read for a channel's.`,
        summary: "Create a signature",
      })
    ),
    HttpApiEndpoint.put("update", "/:signatureId", {
      error: [
        Forbidden,
        SignatureNotFound,
        SignatureNameTaken,
        UnknownChannels,
      ],
      params: signature,
      payload: SignatureDetailsSchema,
      success: SignatureSchema,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Replaces a signature's name, text, scope and whether it is a default. Posts that already hold its text keep it as it was. Needs post:update, and channel:read for a channel's.",
        summary: "Update a signature",
      })
    ),
    HttpApiEndpoint.delete("delete", "/:signatureId", {
      error: [Forbidden, SignatureNotFound],
      params: signature,
      success: HttpApiSchema.NoContent,
    }).annotateMerge(
      OpenApi.annotations({
        description:
          "Deletes a signature. Posts that already hold its text keep it. Needs post:update.",
        summary: "Delete a signature",
      })
    )
  )
  .middleware(WorkspaceAccess)
  .middleware(Authentication)
  .prefix("/api/workspaces/:workspaceId/signatures") {}
