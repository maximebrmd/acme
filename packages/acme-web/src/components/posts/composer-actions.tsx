"use client";

import { Button } from "acme-ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "acme-ui/components/dialog";
import { useTranslations } from "next-intl";

/** What the composer is doing. */
export type ComposerAction = "cancel" | "reschedule" | "save" | "schedule";

interface ComposerActionsProps {
  /** What runs now, if anything. */
  readonly busy: ComposerAction | null;
  readonly canCancel: boolean;
  readonly canReschedule: boolean;
  readonly canSave: boolean;
  readonly canSchedule: boolean;
  readonly onAction: (action: ComposerAction) => void;
  /** Whether every channel's platform takes the post as it is. */
  readonly publishable: boolean;
}

// Save, schedule, move or cancel, as the post's status and the member's
// role allow. Buttons stay focusable while something runs.
export const ComposerActions = ({
  busy,
  canCancel,
  canReschedule,
  canSave,
  canSchedule,
  onAction,
  publishable,
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
          {busy === "schedule" ? t("scheduling") : t("schedule")}
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
      {canCancel ? (
        <Dialog>
          <DialogTrigger
            render={<Button variant="destructive" disabled={running} />}
          >
            {busy === "cancel" ? t("cancelling") : t("cancelPost")}
          </DialogTrigger>
          <DialogContent>
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
