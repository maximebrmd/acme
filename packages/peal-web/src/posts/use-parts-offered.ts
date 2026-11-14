"use client";

import { useAtomValue } from "@effect/atom-react";
import { AsyncResult } from "effect/reactivity";
import type { SocialChannel } from "peal-contract";

import { platformCapabilities } from "#analytics/api.ts";

/**
 * Whether this server sends the parts after a post's first on a platform,
 * as its capabilities say (`followUps` null where it sends none: a first
 * comment where it does not read the platform's comments, X where its
 * operator turned threads off), and never on a LinkedIn profile, which
 * takes no comment. Until they are read, the platform's own rules stand,
 * and the server checks again when the post is scheduled.
 */
export const usePartsOffered = (
  workspaceId: string
): ((channel: Pick<SocialChannel, "connection" | "platform">) => boolean) => {
  const capabilities = useAtomValue(platformCapabilities(workspaceId));

  return ({ connection, platform }) =>
    (platform !== "linkedin" || connection === "linkedinPage") &&
    (!AsyncResult.isSuccess(capabilities) ||
      capabilities.value.some(
        (described) =>
          described.platform === platform && described.followUps !== null
      ));
};
