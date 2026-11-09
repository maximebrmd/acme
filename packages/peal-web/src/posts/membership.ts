import type { Membership } from "acme-contract";
import { Option } from "effect";
import type { Locale } from "next-intl";
import { notFound } from "next/navigation";

import { currentUser } from "#auth/session.ts";
import { redirect } from "#i18n/navigation.ts";

/** A signed-in user in one of their workspaces. */
export interface Viewer {
  readonly membership: Membership;
  readonly userId: string;
}

/**
 * For the workspace's pages: the signed-in user, and their membership of
 * it. Anyone signed out is sent to sign in, and a workspace they do not
 * belong to is not found.
 */
export const viewerOf = async (
  locale: Locale,
  workspaceId: string
): Promise<Viewer> => {
  const me = await currentUser();

  if (Option.isNone(me)) {
    return redirect({ href: "/sign-in", locale });
  }

  const membership = me.value.workspaces.find(({ id }) => id === workspaceId);

  if (membership === undefined) {
    notFound();
  }

  return { membership, userId: me.value.user.id };
};

/** The signed-in user's membership of the workspace (see `viewerOf`). */
export const membershipOf = async (
  locale: Locale,
  workspaceId: string
): Promise<Membership> => {
  const { membership } = await viewerOf(locale, workspaceId);

  return membership;
};
