import { Config } from "effect";

// The Acme server as this Next process reaches it. It is read at request
// time, never at build time, so one build runs against any server.
export const serverUrl = Config.String("ACME_API_URL").pipe(
  Config.withDefault("http://localhost:3000")
);
