import { and, eq, isNull, or } from "drizzle-orm";
import type { Column, SQL } from "drizzle-orm";
import { Option } from "effect";

import type { SignedInChannels } from "#channels/domain/data-deletion.ts";

import { channels } from "./schema.ts";

/**
 * Rows of the platform and, for Instagram, of the connection: one stored
 * without any came through Facebook Login.
 */
export const signedInRows = (
  columns: { readonly connection: Column; readonly platform: Column },
  { connection, platform }: SignedInChannels
): SQL | undefined =>
  Option.match(connection, {
    onNone: () => eq(columns.platform, platform),
    onSome: (way) =>
      and(
        eq(columns.platform, platform),
        way === "facebookLogin"
          ? or(isNull(columns.connection), eq(columns.connection, way))
          : eq(columns.connection, way)
      ),
  });

/**
 * The user's channels among those the app signs in, in every workspace:
 * granted by them, or their own account. An Instagram Login channel keeps
 * the app-scoped id as its grant and the professional account's id as its
 * account, and Meta's request may name either.
 */
export const userChannels = (
  signedIn: readonly SignedInChannels[],
  userId: string
): SQL | undefined =>
  or(
    ...signedIn.map((rows) =>
      and(
        signedInRows(channels, rows),
        Option.contains(rows.connection, "instagramLogin")
          ? or(eq(channels.grantedBy, userId), eq(channels.accountId, userId))
          : or(
              eq(channels.grantedBy, userId),
              and(isNull(channels.grantedBy), eq(channels.accountId, userId))
            )
      )
    )
  );
