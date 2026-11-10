import { Effect, Schema } from "effect";

const text = Schema.Trim.check(Schema.isNonEmpty(), Schema.isMaxLength(500));

const absent = <S extends Schema.Top>(schema: S) =>
  Schema.NullOr(schema).pipe(
    Schema.withDecodingDefaultKey(Effect.succeed(null))
  );

/** A provider the operator uses to run the service: a sub-processor. */
export const DeclaredRecipientSchema = Schema.Struct({
  // Where it processes the data.
  country: text,
  name: text,
  // What safeguards a transfer outside the EEA, when there is one.
  safeguard: absent(text),
  // What it does for the operator: hosting, email delivery, payments.
  service: text,
});

/** A sentence in each language the app speaks. */
const BilingualSchema = Schema.Struct({ en: text, fr: text });

/**
 * What whoever runs the server declares about its processing, which the
 * software cannot know: who the controller is and how to reach it, where
 * its privacy policy is, the providers it uses (its sub-processors), its
 * supervisory authority, and, for what it runs itself (logs, backups),
 * its own retention when it differs from the production stack's. Each
 * part is absent until declared: nothing is guessed.
 */
export const OperatorDeclarationSchema = Schema.Struct({
  controller: absent(
    Schema.Struct({
      address: absent(text),
      // Where privacy requests go: an address, or a page.
      contact: absent(text),
      dataProtectionOfficer: absent(text),
      name: text,
    })
  ),
  policyUrl: absent(text),
  recipients: absent(Schema.Array(DeclaredRecipientSchema)),
  // By category id (`technicalLogs`, `backups`): how long the operator's
  // own stack keeps it, in each language.
  retention: Schema.Record(Schema.String, BilingualSchema).pipe(
    Schema.withDecodingDefaultKey(Effect.succeed({}))
  ),
  supervisoryAuthority: absent(
    Schema.Struct({ name: text, url: absent(text) })
  ),
});

export type OperatorDeclaration = typeof OperatorDeclarationSchema.Type;

/** What a server whose operator declared nothing knows. */
export const undeclared: OperatorDeclaration = {
  controller: null,
  policyUrl: null,
  recipients: null,
  retention: {},
  supervisoryAuthority: null,
};
