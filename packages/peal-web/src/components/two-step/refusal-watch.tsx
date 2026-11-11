"use client";

import { useEffect } from "react";

import { useRouter } from "#i18n/navigation.ts";
import { onTwoStepRefusal } from "#two-step/refusals.ts";

/**
 * Around a workspace's pages: once the API refuses the member for want of
 * two-step verification (its owners required it while the page was open),
 * the page is read again, and the workspace's layout shows the notice in
 * its place. One place for every request a page makes.
 */
export const TwoStepRefusalWatch = () => {
  const router = useRouter();

  useEffect(
    () =>
      onTwoStepRefusal(() => {
        router.refresh();
      }),
    [router]
  );

  return null;
};
