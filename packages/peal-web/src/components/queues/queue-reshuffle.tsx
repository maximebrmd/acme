"use client";

import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Exit } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useTranslations } from "next-intl";
import type { Queue } from "peal-contract";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "peal-ui/components/alert-dialog";
import { Button } from "peal-ui/components/button";
import { useState, useTransition } from "react";

import { queuedPosts, queuesChanged, reshuffleQueue } from "#queues/atoms.ts";

import { QueueReshuffleView } from "./queue-reshuffle-view.tsx";
import type { ReshuffleState } from "./queue-reshuffle-view.tsx";

/**
 * Offers, once a queue's slots changed, to move the posts that wait in it
 * onto its new slots, with a confirmation that says posts moved by hand
 * move too. Nothing shows while none waits.
 */
export const QueueReshuffle = ({
  queue,
  workspaceId,
}: {
  readonly queue: Queue;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("Queues.reshuffle");
  const settings = useTranslations("Settings");

  const scheduled = useAtomValue(
    queuedPosts(workspaceId, queue.id, "scheduled")
  );

  const held = useAtomValue(
    queuedPosts(workspaceId, queue.id, "awaitingApproval")
  );

  const reshuffle = useAtomSet(reshuffleQueue, { mode: "promiseExit" });
  const [state, setState] = useState<ReshuffleState>({ _tag: "offered" });
  const [isMoving, startMoving] = useTransition();

  if (!(AsyncResult.isSuccess(scheduled) && AsyncResult.isSuccess(held))) {
    return null;
  }

  const count = scheduled.value.items.length + held.value.items.length;

  const more =
    scheduled.value.nextCursor !== null || held.value.nextCursor !== null;

  if (count === 0 && state._tag === "offered") {
    return null;
  }

  const handleMove = () => {
    setState({ _tag: "moving" });
    startMoving(async () => {
      const exit = await reshuffle({
        params: { queueId: queue.id, workspaceId },
        reactivityKeys: [...queuesChanged(workspaceId), "posts"],
      });

      setState(
        Exit.isSuccess(exit)
          ? { _tag: "done", result: exit.value }
          : { _tag: "failed" }
      );
    });
  };

  const action = (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            disabled={isMoving}
            focusableWhenDisabled
          />
        }
      >
        {isMoving ? t("moving") : t("action")}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("confirmTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("confirmDescription")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{settings("cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={handleMove}>
            {t("confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return (
    <QueueReshuffleView
      action={action}
      count={count}
      more={more}
      state={state}
    />
  );
};
