import { Config } from "effect";

// The Acme server's port in development, where `next dev` runs on 3001.
const developmentServer = "http://localhost:3000";

const nodeEnv = Config.String("NODE_ENV").pipe(
  Config.withDefault("development")
);

// The Acme server as this Next process reaches it. It is read at request
// time, never at build time, so one build runs against any server. Outside
// production it defaults to the development server. A production server
// requires it: 3000 is also the port Next itself listens on there, so a
// default would point the app at itself.
export const serverUrl = nodeEnv.pipe(
  Config.flatMap((environment) => {
    const url = Config.String("ACME_API_URL");

    return environment === "production"
      ? url
      : url.pipe(Config.withDefault(developmentServer));
  })
);
