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
