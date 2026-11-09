import { Config, Effect, Option, Redacted } from "effect";

import { InvalidMetaSettings } from "./invalid-meta-settings.ts";

/** An app of Meta's developer dashboard: its id and its secret. */
export interface MetaApp {
  readonly appId: string;
  readonly appSecret: Redacted.Redacted;
}

const nonBlank = (name: string) =>
  Config.option(Config.String(name)).pipe(
    Config.map(Option.filter((value) => value.trim() !== ""))
  );

const nonBlankRedacted = (name: string) =>
  Config.option(Config.Redacted(name)).pipe(
    Config.map(Option.filter((value) => Redacted.value(value).trim() !== ""))
  );

const appIdPattern = /^\d{1,32}$/u;

// Both settings, or neither: one without the other is a mistake that would
// only show when a member tries to connect, so the server refuses to start.
const appConfig = (prefix: string) =>
  Effect.gen(function* readApp() {
    const appId = yield* nonBlank(`${prefix}_APP_ID`);
    const appSecret = yield* nonBlankRedacted(`${prefix}_APP_SECRET`);

    if (Option.isNone(appId) && Option.isNone(appSecret)) {
      return Option.none<MetaApp>();
    }

    if (Option.isNone(appId) || Option.isNone(appSecret)) {
      return yield* new InvalidMetaSettings({
        reason: `${prefix}_APP_ID and ${prefix}_APP_SECRET go together`,
      });
    }

    if (!appIdPattern.test(appId.value.trim())) {
      return yield* new InvalidMetaSettings({
        reason: `${prefix}_APP_ID is not an app id`,
      });
    }

    const app: MetaApp = {
      appId: appId.value.trim(),
      appSecret: appSecret.value,
    };

    return Option.some(app);
  });

/**
 * Meta's main app (`META_APP_ID`, `META_APP_SECRET`): Facebook Login, which
 * connects Facebook Pages and the Instagram professional accounts linked to
 * them. None when unset: the server then connects neither.
 */
export const metaAppConfig = appConfig("META");

/**
 * The app's Threads credentials (`THREADS_APP_ID`, `THREADS_APP_SECRET`),
 * which the dashboard's Threads use case gives apart from the main ones.
 * None when unset: the server then connects no Threads account.
 */
export const threadsAppConfig = appConfig("THREADS");

/**
 * The app's Instagram credentials (`INSTAGRAM_APP_ID`,
 * `INSTAGRAM_APP_SECRET`), which the dashboard's Instagram use case gives
 * apart from the main ones, for Business Login for Instagram. None when
 * unset: the server then connects Instagram accounts through Facebook Login
 * only, with Meta's main app.
 */
export const instagramAppConfig = appConfig("INSTAGRAM");
