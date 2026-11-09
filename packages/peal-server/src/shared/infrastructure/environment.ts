import { Config } from "effect";

/** Whether the server runs in production: NODE_ENV, which the image sets. */
export const isProduction = Config.String("NODE_ENV").pipe(
  Config.withDefault("development"),
  Config.map((environment) => environment === "production")
);

/**
 * A setting production must be given, and that defaults elsewhere, so the
 * development stack runs without configuration.
 */
export const requiredInProduction = <A>(
  config: Config.Config<A>,
  developmentDefault: A
): Config.Config<A> =>
  isProduction.pipe(
    Config.flatMap((production) =>
      production ? config : config.pipe(Config.withDefault(developmentDefault))
    )
  );

// The web app's address in development (`nx run peal-web:dev`).
const developmentPublicUrl = "http://localhost:3001";

/**
 * The origin people open Peal at (PUBLIC_URL): the web app, which forwards
 * /api/* to the server. Links in emails and the platforms' redirect URIs are
 * built from it. Outside production it defaults to the development web app.
 */
export const publicUrlConfig = requiredInProduction(
  Config.URL("PUBLIC_URL"),
  new URL(developmentPublicUrl)
).pipe(Config.map((url) => url.origin));
