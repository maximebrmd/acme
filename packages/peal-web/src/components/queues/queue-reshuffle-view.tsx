"use client";

import { useTranslations } from "next-intl";
import { queueHorizonDays } from "peal-contract";
import type { QueueReshuffle } from "peal-contract";
import type { ReactNode } from "react";

/** Where moving a queue's waiting posts onto its slots stands. */
export type ReshuffleState =
  | { readonly _tag: "done"; readonly result: QueueReshuffle }
  | { readonly _tag: "failed" }
  | { readonly _tag: "moving" }
  | { readonly _tag: "offered" };

/**
 * The offer, once a queue's slots changed while posts wait in it, to move
 * them onto its new slots: how many wait (`more` when there are more than
 * `count`), the button that asks to confirm (`action`), and what the move
 * did once it is done.
 */
export const QueueReshuffleView = ({
  action,
  count,
  more,
  state,
}: {
  readonly action: ReactNode;
  readonly count: number;
  readonly more: boolean;
  readonly state: ReshuffleState;
}) => {
  const t = useTranslations("Queues.reshuffle");

  return (
    <div className="flex flex-col gap-2 rounded-md border p-3 text-sm">
      <p>{t("waiting", { count, more: String(more) })}</p>
      <output className="flex flex-col gap-1">
        {state._tag === "done" ? (
          <>
            <p>
              {t("result", {
                moved: state.result.moved,
                remaining: state.result.remaining,
                unchanged: state.result.unchanged,
              })}
            </p>
            {state.result.stoppedBy === null ? null : (
              <p>
                {t("stopped", {
                  days: queueHorizonDays,
                  reason: state.result.stoppedBy,
                })}
              </p>
            )}
          </>
        ) : null}
        {state._tag === "failed" ? <p>{t("failed")}</p> : null}
      </output>
      <div>{action}</div>
    </div>
  );
};
