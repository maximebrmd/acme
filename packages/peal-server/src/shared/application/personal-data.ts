import type { DateTime } from "effect";

// What each context keeps about a workspace or a user, as an export of their
// data carries it, and as the contexts that hold it hand it to the workspace
// context, which answers for people's rights over their data (copy and
// erasure). Plain data: absent values are null, so the shapes read as the
// export does; secrets (tokens, keys, file contents) never appear.

/** A channel of a workspace, without its tokens. */
export interface ChannelRecord {
  readonly createdAt: DateTime.Utc;
  readonly displayName: string | null;
  readonly handle: string;
  readonly id: string;
  readonly platform: string;
  readonly status: string;
}

/** A post of a workspace, with where it went. */
export interface PostRecord {
  readonly id: string;
  readonly media: readonly {
    readonly altText: string | null;
    readonly mediaId: string;
  }[];
  readonly scheduledAt: DateTime.Utc | null;
  readonly status: string;
  readonly targets: readonly {
    readonly channelId: string;
    readonly finishedAt: DateTime.Utc | null;
    /** The platform kept the video private although it was asked otherwise. */
    readonly keptPrivate: boolean;
    /** What the post set on that channel's platform, as stored: plain JSON. */
    readonly options: unknown;
    readonly permalink: string | null;
    readonly status: string;
  }[];
  readonly text: string;
  readonly textOverrides: readonly {
    readonly channelId: string;
    readonly text: string;
  }[];
  readonly timeZone: string | null;
}

/**
 * A post a user wrote in a workspace they share with others: its content is
 * theirs, though the post belongs to the workspace.
 */
export interface AuthoredPostRecord extends PostRecord {
  readonly workspaceId: string;
}

/** A media asset of a workspace: what is known of the file, not the file. */
export interface MediaRecord {
  readonly altText: string | null;
  readonly byteSize: number;
  readonly contentType: string;
  readonly createdAt: DateTime.Utc;
  readonly durationMs: number | null;
  readonly height: number | null;
  readonly id: string;
  readonly status: string;
  readonly width: number | null;
}

/** A post's counts on a channel as analytics read them at one moment. */
export interface MetricsSnapshotRecord {
  readonly collectedAt: DateTime.Utc;
  readonly impressions: number | null;
  readonly likes: number;
  readonly quotes: number | null;
  readonly replies: number;
  readonly reposts: number;
}

/**
 * A post that went live on a channel of a workspace, as analytics followed
 * it: where it is, and each reading of its counts. Ids and counts, never
 * what the post says, which the post's own record holds.
 */
export interface AnalyticsRecord {
  readonly channelId: string;
  readonly permalink: string | null;
  readonly postId: string;
  readonly publishedAt: DateTime.Utc;
  readonly snapshots: readonly MetricsSnapshotRecord[];
  readonly targetId: string;
}

/** How many requests a workspace sent the writing assistant one UTC day. */
export interface UsageRecord {
  /** YYYY-MM-DD. */
  readonly day: string;
  readonly requests: number;
}

/**
 * A workspace's plan and its Stripe subscriptions as their last events left
 * them: no card, invoice, customer or subscription id. The plan is null on
 * a server that does not bill.
 */
export interface BillingRecord {
  readonly plan: string | null;
  readonly subscriptions: readonly {
    readonly cancelAtPeriodEnd: boolean;
    readonly currentPeriodEnd: DateTime.Utc | null;
    readonly plan: string;
    readonly status: string;
  }[];
}

/** The account a notice is about, as it was then. */
export interface NoticeChannelRecord {
  readonly handle: string;
  readonly platform: string;
}

/** What a notice says happened, as the notices API lists it. */
export type NoticeEventRecord =
  | {
      readonly _tag: "ChannelReconnectRequired";
      readonly channel: NoticeChannelRecord;
    }
  | {
      readonly _tag: "ChannelReconnectSoon";
      readonly channel: NoticeChannelRecord;
      readonly expiresAt: DateTime.Utc;
    }
  | {
      readonly _tag: "PostFailed";
      readonly channel: NoticeChannelRecord | null;
      readonly postId: string;
      readonly reason: string;
    }
  | {
      readonly _tag: "PostPublished";
      readonly channel: NoticeChannelRecord | null;
      readonly permalink: string | null;
      readonly postId: string;
    }
  | {
      readonly _tag: "PostUnconfirmed";
      readonly channel: NoticeChannelRecord | null;
      readonly postId: string;
    };

/** A notice of a user. */
export interface NoticeRecord {
  readonly createdAt: DateTime.Utc;
  readonly event: NoticeEventRecord;
  readonly id: string;
  readonly readAt: DateTime.Utc | null;
  readonly workspaceId: string;
}

/**
 * Which notices a user also receives by email, and whether they hear about
 * every post of their workspaces or only their own.
 */
export interface PreferencesRecord {
  readonly email: {
    readonly channelReconnect: boolean;
    readonly postFailed: boolean;
    readonly postPublished: boolean;
    readonly postUnconfirmed: boolean;
  };
  readonly everyPost: boolean;
}

/**
 * Something staff did to a user's account, as the audit log keeps it: the
 * action, when, the ban's end and the reason given. Who did it is staff's,
 * and stays out.
 */
export interface StaffActionRecord {
  readonly action: string;
  readonly at: DateTime.Utc;
  readonly banExpiresAt: DateTime.Utc | null;
  readonly reason: string | null;
}
