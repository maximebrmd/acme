"use client";

import { useTranslations } from "next-intl";
import { Button } from "peal-ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "peal-ui/components/dialog";

/** What the composer is doing. */
export type ComposerAction =
  | "cancel"
  | "discard"
  | "reschedule"
  | "save"
  | "schedule"
  | "unschedule";

interface ComposerActionsProps {
  /** What runs now, if anything. */
  readonly busy: ComposerAction | null;
  readonly canCancel: boolean;
  readonly canDiscard: boolean;
  readonly canReschedule: boolean;
  readonly canSave: boolean;
  readonly canSchedule: boolean;
  readonly canUnschedule: boolean;
  readonly onAction: (action: ComposerAction) => void;
  /** Whether every channel's platform takes the post as it is. */
  readonly publishable: boolean;
  /** Whether what this member schedules waits for an approval. */
  readonly willWait: boolean;
}

// Deletes the draft once the member confirms.
const DiscardDraft = ({
  busy,
  onAction,
}: {
  readonly busy: ComposerAction | null;
  readonly onAction: (action: ComposerAction) => void;
}) => {
  const t = useTranslations("Posts.Composer");

  return (
    <Dialog>
      <DialogTrigger
        render={<Button variant="destructive" disabled={busy !== null} />}
      >
        {busy === "discard" ? t("discarding") : t("discard")}
      </DialogTrigger>
      <DialogContent closeLabel={t("closeDialog")}>
        <DialogHeader>
          <DialogTitle>{t("discardTitle")}</DialogTitle>
          <DialogDescription>{t("discardDescription")}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            {t("keepDraft")}
          </DialogClose>
          <DialogClose
            render={<Button variant="destructive" />}
            onClick={() => {
              onAction("discard");
            }}
          >
            {t("confirmDiscard")}
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Save, schedule, move, take back to draft, discard or cancel, as the
// post's status and the member's role allow. Buttons stay focusable while
// something runs.
export const ComposerActions = ({
  busy,
  canCancel,
  canDiscard,
  canReschedule,
  canSave,
  canSchedule,
  canUnschedule,
  onAction,
  publishable,
  willWait,
}: ComposerActionsProps) => {
  const t = useTranslations("Posts.Composer");
  const running = busy !== null;

  return (
    <div className="flex flex-wrap gap-2">
      {canSave ? (
        <Button
          variant="outline"
          disabled={running}
          focusableWhenDisabled
          onClick={() => {
            onAction("save");
          }}
        >
          {busy === "save" ? t("saving") : t("saveDraft")}
        </Button>
      ) : null}
      {canSchedule ? (
        <Button
          disabled={running || !publishable}
          focusableWhenDisabled
          onClick={() => {
            onAction("schedule");
          }}
        >
          {busy === "schedule"
            ? t(willWait ? "askingApproval" : "scheduling")
            : t(willWait ? "askApproval" : "schedule")}
        </Button>
      ) : null}
      {canReschedule ? (
        <Button
          disabled={running}
          focusableWhenDisabled
          onClick={() => {
            onAction("reschedule");
          }}
        >
          {busy === "reschedule" ? t("rescheduling") : t("reschedule")}
        </Button>
      ) : null}
      {canUnschedule ? (
        <Button
          variant="outline"
          disabled={running}
          focusableWhenDisabled
          onClick={() => {
            onAction("unschedule");
          }}
        >
          {busy === "unschedule" ? t("unscheduling") : t("unschedule")}
        </Button>
      ) : null}
      {canDiscard ? <DiscardDraft busy={busy} onAction={onAction} /> : null}
      {canCancel ? (
        <Dialog>
          <DialogTrigger
            render={<Button variant="destructive" disabled={running} />}
          >
            {busy === "cancel" ? t("cancelling") : t("cancelPost")}
          </DialogTrigger>
          <DialogContent closeLabel={t("closeDialog")}>
            <DialogHeader>
              <DialogTitle>{t("cancelTitle")}</DialogTitle>
              <DialogDescription>{t("cancelDescription")}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                {t("keepPost")}
              </DialogClose>
              <DialogClose
                render={<Button variant="destructive" />}
                onClick={() => {
                  onAction("cancel");
                }}
              >
                {t("confirmCancel")}
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
};
