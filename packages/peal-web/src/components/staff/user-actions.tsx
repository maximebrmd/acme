"use client";

import { useAtomSet } from "@effect/atom-react";
import { DateTime, Option, Schema } from "effect";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription } from "peal-ui/components/alert";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "peal-ui/components/alert-dialog";
import { Button } from "peal-ui/components/button";
import { Label } from "peal-ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "peal-ui/components/select";
import { Textarea } from "peal-ui/components/textarea";
import { useId, useState, useTransition } from "react";
import type { ChangeEvent, ReactNode } from "react";
import { toast } from "sonner";

import { useHydrated } from "#components/media/use-hydrated.ts";
import { useRouter } from "#i18n/navigation.ts";
import {
  banUser,
  impersonateUser,
  resendVerification,
  resetTwoStep,
  revokeUserSessions,
  unbanUser,
} from "#staff/atoms.ts";
import { staffErrorKey } from "#staff/errors.ts";
import type { StaffErrorKey } from "#staff/errors.ts";

type ActionName =
  | "ban"
  | "impersonate"
  | "resendVerification"
  | "resetTwoStep"
  | "revokeSessions"
  | "unban";

// How long a ban lasts, from now; none lasts until staff lift it.
const DurationSchema = Schema.Literals(["forever", "day", "week", "month"]);

type Duration = typeof DurationSchema.Type;

const isDuration = Schema.is(DurationSchema);

const days: Readonly<Record<Exclude<Duration, "forever">, number>> = {
  day: 1,
  month: 30,
  week: 7,
};

const endOf = (duration: Duration): DateTime.Utc | null =>
  duration === "forever"
    ? null
    : DateTime.add(DateTime.nowUnsafe(), { days: days[duration] });

interface ActionDialogProps {
  readonly action: ActionName;
  readonly children?: ReactNode;
  readonly destructive?: boolean;
  readonly name: string;
  // Carries the action out with the reason given, and tells how it ended.
  readonly onConfirm: (reason: string) => Promise<Option.Option<StaffErrorKey>>;
  readonly onDone: () => void;
}

// One action: a button that opens a confirmation, which asks why, and
// stays open with the reason it failed.
const ActionDialog = ({
  action,
  children,
  destructive = false,
  name,
  onConfirm,
  onDone,
}: ActionDialogProps) => {
  const t = useTranslations("Staff.actions");
  const errors = useTranslations("Staff.errors");
  const reasonId = useId();
  const hintId = useId();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<StaffErrorKey | null>(null);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  // The server renders the button, which opens nothing until the page has
  // hydrated: it stays disabled until then, never a click lost.
  const hydrated = useHydrated();

  const handleOpenChange = (next: boolean) => {
    setOpen(next);

    if (!next) {
      setReason("");
      setError(null);
    }
  };

  const handleReason = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setReason(event.target.value);
  };

  const handleConfirm = () => {
    startTransition(async () => {
      Option.match(await onConfirm(reason.trim()), {
        onNone: () => {
          setOpen(false);
          setReason("");
          onDone();
        },
        onSome: setError,
      });
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger
        disabled={!hydrated}
        render={
          <Button variant={destructive ? "destructive" : "outline"} size="sm" />
        }
      >
        {t(`${action}.open`)}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t(`${action}.title`, { name })}</AlertDialogTitle>
          <AlertDialogDescription>
            {t(`${action}.description`)}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error === null ? null : (
          <Alert variant="destructive">
            <AlertDescription>{errors(error)}</AlertDescription>
          </Alert>
        )}
        {children}
        <div className="flex flex-col gap-2">
          <Label htmlFor={reasonId}>{t("reason")}</Label>
          <Textarea
            id={reasonId}
            aria-describedby={hintId}
            value={reason}
            maxLength={500}
            required
            onChange={handleReason}
          />
          <p id={hintId} className="text-muted-foreground text-sm">
            {t("reasonHint")}
          </p>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {t("cancel")}
          </AlertDialogCancel>
          <Button
            variant={destructive ? "destructive" : "default"}
            disabled={reason.trim() === "" || isPending}
            focusableWhenDisabled
            onClick={handleConfirm}
          >
            {isPending ? t(`${action}.pending`) : t(`${action}.confirm`)}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export interface UserActionsProps {
  readonly banned: boolean;
  readonly email: string;
  readonly emailVerified: boolean;
  readonly name: string;
  // Whether the account is the staff member's own, or other staff's.
  readonly self: boolean;
  readonly staff: boolean;
  // Whether the account's two-step verification is on.
  readonly twoStepEnabled: boolean;
  readonly userId: string;
}

// What staff may do to the account: what does not apply to it is not
// offered, and the server refuses it anyway.
export const UserActions = ({
  banned,
  email,
  emailVerified,
  name,
  self,
  staff,
  twoStepEnabled,
  userId,
}: UserActionsProps) => {
  const t = useTranslations("Staff.actions");
  const router = useRouter();
  const durationId = useId();
  const [duration, setDuration] = useState<Duration>("forever");
  const params = { userId };

  const ban = useAtomSet(banUser, { mode: "promiseExit" });
  const unban = useAtomSet(unbanUser, { mode: "promiseExit" });
  const revoke = useAtomSet(revokeUserSessions, { mode: "promiseExit" });
  const resend = useAtomSet(resendVerification, { mode: "promiseExit" });
  const impersonate = useAtomSet(impersonateUser, { mode: "promiseExit" });
  const reset = useAtomSet(resetTwoStep, { mode: "promiseExit" });

  const refreshWith = (message: string) => () => {
    toast.success(message);
    router.refresh();
  };

  // Signed in as the account: its own pages, which show the banner.
  const openTheirApp = () => {
    router.push("/app");
    router.refresh();
  };

  const handleDuration = (value: string | null) => {
    if (isDuration(value)) {
      setDuration(value);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {banned ? (
        <ActionDialog
          action="unban"
          name={name}
          onConfirm={async (reason) =>
            staffErrorKey(await unban({ params, payload: { reason } }))
          }
          onDone={refreshWith(t("unban.done", { name }))}
        />
      ) : null}
      {banned || self ? null : (
        <ActionDialog
          action="ban"
          destructive
          name={name}
          onConfirm={async (reason) =>
            staffErrorKey(
              await ban({
                params,
                payload: { expiresAt: endOf(duration), reason },
              })
            )
          }
          onDone={refreshWith(t("ban.done", { name }))}
        >
          <div className="flex flex-col gap-2">
            <Label id={durationId}>{t("ban.duration")}</Label>
            <Select value={duration} onValueChange={handleDuration}>
              <SelectTrigger aria-labelledby={durationId}>
                <SelectValue>{t(`ban.${duration}`)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {DurationSchema.literals.map((value) => (
                  <SelectItem key={value} value={value}>
                    {t(`ban.${value}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </ActionDialog>
      )}
      {self ? null : (
        <ActionDialog
          action="revokeSessions"
          name={name}
          onConfirm={async (reason) =>
            staffErrorKey(await revoke({ params, payload: { reason } }))
          }
          onDone={refreshWith(t("revokeSessions.done", { name }))}
        />
      )}
      {self || !twoStepEnabled ? null : (
        <ActionDialog
          action="resetTwoStep"
          destructive
          name={name}
          onConfirm={async (reason) =>
            staffErrorKey(await reset({ params, payload: { reason } }))
          }
          onDone={refreshWith(t("resetTwoStep.done", { name }))}
        />
      )}
      {emailVerified ? null : (
        <ActionDialog
          action="resendVerification"
          name={name}
          onConfirm={async (reason) =>
            staffErrorKey(await resend({ params, payload: { reason } }))
          }
          onDone={refreshWith(t("resendVerification.done", { email }))}
        />
      )}
      {self || staff || banned ? null : (
        <ActionDialog
          action="impersonate"
          name={name}
          onConfirm={async (reason) =>
            staffErrorKey(await impersonate({ params, payload: { reason } }))
          }
          onDone={openTheirApp}
        />
      )}
    </div>
  );
};
