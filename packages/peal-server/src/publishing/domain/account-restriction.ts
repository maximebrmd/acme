import type { MediaContentType } from "./media-file.ts";
import type { TikTokBlock } from "./tiktok-creator.ts";

/**
 * What a channel's own account narrows in its platform's rules, as the
 * platform says when asked:
 *
 * - `optionValues`: the option takes only these of its values (the
 *   audiences a TikTok account offers).
 * - `optionFixed`: the yes-or-no option must have this value (an
 *   interaction a TikTok creator turned off stays off).
 * - `videoDuration`: the account's videos last this long at most.
 * - `mediaTypesRefused`: files of these types are refused on the channel
 *   (photos, on a server TikTok takes none from).
 */
export type AccountRestriction =
  | {
      readonly _tag: "optionValues";
      readonly field: string;
      readonly values: readonly string[];
    }
  | {
      readonly _tag: "optionFixed";
      readonly field: string;
      readonly value: boolean;
    }
  | { readonly _tag: "videoDuration"; readonly maximumMs: number }
  | {
      readonly _tag: "mediaTypesRefused";
      readonly contentTypes: readonly MediaContentType[];
    };

/** Why the platform's answer about the account could not be had. */
export type AccountUnreadReason =
  | "disabled"
  | "disconnected"
  | "platformUnreachable"
  | "rateLimited"
  | "reconnect";

/**
 * What is known of a channel's account beyond its platform's rules:
 *
 * - `unrestricted`: its platform asks accounts nothing Peal reads.
 * - `read`: the platform answered: `restrictions`, and `blocked` when the
 *   account cannot post now.
 * - `unread`: the platform could not be asked now. The platform's rules
 *   still hold; the account's are checked when a post is scheduled.
 */
export type AccountStanding =
  | { readonly _tag: "unrestricted" }
  | {
      readonly _tag: "read";
      readonly blocked: TikTokBlock | undefined;
      readonly restrictions: readonly AccountRestriction[];
    }
  | { readonly _tag: "unread"; readonly reason: AccountUnreadReason };
