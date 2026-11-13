"use client";

import { useTranslations } from "next-intl";
import type { Excess } from "peal-contract";

import { useSize } from "#billing/size.ts";

/**
 * What a workspace holds beyond a plan, one line each, in the words of the
 * page that shows it.
 */
export const ExcessList = ({
  excesses,
  namespace,
}: {
  readonly excesses: readonly Excess[];
  readonly namespace: "OverPlan";
}) => {
  const t = useTranslations(namespace);
  const size = useSize();

  return (
    <ul className="list-disc pl-5 text-sm">
      {excesses.map(({ allowed, limit, used }) => (
        <li key={limit}>
          {limit === "mediaStorage"
            ? t("excessStorage", { allowed: size(allowed), used: size(used) })
            : t("excess", { allowed, limit, used })}
        </li>
      ))}
    </ul>
  );
};
