import { DateTime, Option, Schema } from "effect";

/** Staff banned the user, for good or until `expiresAt`. */
export const BanSchema = Schema.Struct({
  expiresAt: Schema.Option(Schema.DateTimeUtc),
});

export type Ban = typeof BanSchema.Type;

/** Whether a ban still holds at `now`. A ban past its end no longer counts. */
export const isBanned = (ban: Option.Option<Ban>, now: DateTime.Utc): boolean =>
  Option.exists(ban, ({ expiresAt }) =>
    Option.match(expiresAt, {
      onNone: () => true,
      onSome: (end) => DateTime.isLessThan(now, end),
    })
  );
