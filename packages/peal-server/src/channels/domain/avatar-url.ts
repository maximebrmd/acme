import { Schema } from "effect";

const webProtocols: ReadonlySet<string> = new Set(["http:", "https:"]);

const isWebUrl = (value: string): boolean => {
  const url = URL.parse(value);

  return url !== null && webProtocols.has(url.protocol);
};

/**
 * Where the platform serves the account's picture: an absolute http or https
 * URL, so clients can show it as an image and nothing else.
 */
export const AvatarUrlSchema = Schema.String.check(
  Schema.makeFilter(isWebUrl, { expected: "an http or https URL" })
).pipe(Schema.brand("AvatarUrl"));

export type AvatarUrl = typeof AvatarUrlSchema.Type;
