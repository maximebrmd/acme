/**
 * How an operator gives Stripe the catalogue, as the server's messages
 * say it: with the image a server runs, where its key already is, or from
 * the repository.
 */
export const catalogueCommand =
  "docker compose run --rm --no-deps server packages/peal-server/scripts/stripe-catalogue.ts; from the repository, bun nx run peal-server:stripe-catalogue";
