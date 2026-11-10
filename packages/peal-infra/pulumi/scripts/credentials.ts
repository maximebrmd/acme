// What Pulumi needs before it runs, kept in one item of the owner's login
// keychain (README.md, "State and credentials"): one item, so a run asks
// once. Its password is this struct as JSON.
import type { Option } from "effect";
import { Schema } from "effect";

export const keychainService = "peal-pulumi";
export const keychainAccount = "peal";

export const CredentialsSchema = Schema.Struct({
  AWS_ACCESS_KEY_ID: Schema.NonEmptyString,
  AWS_SECRET_ACCESS_KEY: Schema.NonEmptyString,
  CLOUDFLARE_API_TOKEN: Schema.NonEmptyString,
  PULUMI_CONFIG_PASSPHRASE: Schema.NonEmptyString,
});

export type Credentials = typeof CredentialsSchema.Type;

export const credentialNames: readonly (keyof Credentials)[] = [
  "CLOUDFLARE_API_TOKEN",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "PULUMI_CONFIG_PASSPHRASE",
];

// None when the text is not the struct: the caller says so without quoting
// it, as a decoding error would.
export const credentialsFrom = (text: string): Option.Option<Credentials> =>
  Schema.decodeUnknownOption(Schema.fromJsonString(CredentialsSchema))(text);
