import type { StripeCatalogueDiffers } from "./stripe-catalogue-differs.ts";
import type { StripeCatalogueUnread } from "./stripe-catalogue-unread.ts";

/**
 * How an operator gives Stripe the catalogue, as the server's messages
 * say it: with the image a server runs, where its key already is, or from
 * the repository.
 */
export const catalogueCommand =
  "docker compose run --rm --no-deps server packages/peal-server/scripts/stripe-catalogue.ts; from the repository, bun nx run peal-server:stripe-catalogue";

/**
 * The exit code of `stripe-catalogue` (and its `--check`) for how it
 * failed, which a release reads, never its words: 3, the catalogue
 * differs; 4, Stripe refused the key or answered what cannot be read, as
 * the server's start check would stop on; 5, Stripe did not answer, which
 * the server starts through. Anything else is 1.
 */
export const catalogueExitCode = (
  failure: StripeCatalogueDiffers | StripeCatalogueUnread
): number => {
  if (failure._tag === "StripeCatalogueDiffers") {
    return 3;
  }

  return failure.reason === "unanswered" ? 5 : 4;
};
