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

/** How many requests a workspace sent the writing assistant one UTC day. */
export interface UsageRecord {
  /** YYYY-MM-DD. */
  readonly day: string;
  readonly requests: number;
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

/** Which notices a user also receives by email. */
export interface PreferencesRecord {
  readonly email: {
    readonly channelReconnect: boolean;
    readonly postFailed: boolean;
    readonly postPublished: boolean;
    readonly postUnconfirmed: boolean;
  };
}
