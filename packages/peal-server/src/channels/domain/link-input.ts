import type { Platform } from "./platform.ts";

/**
 * What a platform's sign-in needs from whoever signs in before it starts:
 * the server their account lives on (`instance`, Mastodon), their handle
 * (`handle`, Bluesky, which finds their server from it), or nothing.
 */
export type LinkInput = "handle" | "instance" | "none";

export const linkInputOf = (platform: Platform): LinkInput => {
  if (platform === "mastodon") {
    return "instance";
  }

  return platform === "bluesky" ? "handle" : "none";
};
