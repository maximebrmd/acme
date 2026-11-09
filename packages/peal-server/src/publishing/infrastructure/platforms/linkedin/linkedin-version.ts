import { Config, Schema } from "effect";

/**
 * The version of LinkedIn's API Peal sends (`Linkedin-Version`), as
 * `YYYYMM`. LinkedIn releases one a month and keeps each for at least a
 * year, then answers 426: a test keeps this default within ten months of
 * the day it runs, so a release never ships one about to be retired.
 */
export const defaultLinkedInVersion = "202610";

/** A LinkedIn API version, `YYYYMM`. */
export const LinkedInVersionSchema = Schema.String.check(
  Schema.isPattern(/^20\d{2}(?:0[1-9]|1[0-2])$/u)
);

/**
 * `LINKEDIN_API_VERSION`: the version to send instead, so an operator can
 * move ahead of a release. A value that is not `YYYYMM` stops the server.
 */
export const linkedinVersionConfig = Config.schema(
  LinkedInVersionSchema,
  "LINKEDIN_API_VERSION"
).pipe(Config.withDefault(defaultLinkedInVersion));
