"use client";

import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import { AsyncResult } from "effect/reactivity";
import { useFormatter, useTranslations } from "next-intl";
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
import { Badge } from "peal-ui/components/badge";
import { Button } from "peal-ui/components/button";
import { useTransition } from "react";
import { toast } from "sonner";

import { authClient } from "#auth/client.ts";
import { useHydrated } from "#components/media/use-hydrated.ts";
import { InTimeZone } from "#components/notices/in-time-zone.tsx";
import {
  SettingsLoadFailed,
  SettingsLoading,
} from "#components/settings/settings-status.tsx";
import { browserTimeZone } from "#posts/zoned-time.ts";
import { accountSessions, currentSession } from "#settings/atoms.ts";
import type { AccountSession } from "#settings/atoms.ts";
import { settingsErrorKey } from "#settings/errors.ts";

// A value of a session's request, if it had one.
const known = (value: string | null | undefined): string | undefined =>
  value === null || value === undefined || value.trim() === ""
    ? undefined
    : value;

// One session: the browser it runs in, from where, since when, and signing
// it out, unless it is this one.
const SessionRow = ({
  current,
  onChanged,
  session,
}: {
  readonly current: boolean;
  readonly onChanged: () => void;
  readonly session: AccountSession;
}) => {
  const t = useTranslations("AccountSettings.sessions");
  const errors = useTranslations("Settings.errors");
  const format = useFormatter();
  const [isRevoking, startRevoke] = useTransition();

  const when = (date: Date) =>
    format.dateTime(date, { dateStyle: "medium", timeStyle: "short" });

  // Better Auth stores what the request told, which may be nothing.
  const device = known(session.userAgent) ?? t("unknownDevice");
  const address = known(session.ipAddress) ?? "none";

  const handleRevoke = () => {
    startRevoke(async () => {
      const result = await authClient.revokeSession({ token: session.token });

      if (result.error === null) {
        toast.success(t("revoked"));
        onChanged();
      } else {
        toast.error(errors(settingsErrorKey(result.error)));
      }
    });
  };

  return (
    <li className="flex flex-wrap items-start gap-4 py-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-medium">{device}</span>
          {current ? <Badge variant="secondary">{t("current")}</Badge> : null}
        </span>
        <span className="text-muted-foreground text-sm">
          {t("details", {
            address,
            lastActive: when(session.updatedAt),
            signedIn: when(session.createdAt),
          })}
        </span>
      </div>
      {current ? null : (
        <Button
          variant="ghost"
          size="sm"
          disabled={isRevoking}
          focusableWhenDisabled
          aria-label={isRevoking ? undefined : t("revokeSession", { device })}
          onClick={handleRevoke}
        >
          {isRevoking ? t("revoking") : t("revoke")}
        </Button>
      )}
    </li>
  );
};

// Signs out every session but this one, once confirmed.
const RevokeOthers = ({ onChanged }: { readonly onChanged: () => void }) => {
  const t = useTranslations("AccountSettings.sessions");
  const settings = useTranslations("Settings");
  const errors = useTranslations("Settings.errors");
  const [isPending, startTransition] = useTransition();

  const handleRevoke = () => {
    startTransition(async () => {
      const result = await authClient.revokeOtherSessions();

      if (result.error === null) {
        toast.success(t("othersRevoked"));
        onChanged();
      } else {
        toast.error(errors(settingsErrorKey(result.error)));
      }
    });
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button
            variant="outline"
            disabled={isPending}
            focusableWhenDisabled
          />
        }
      >
        {isPending ? t("revoking") : t("revokeOthers")}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("revokeOthersTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("revokeOthersDescription")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{settings("cancel")}</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleRevoke}>
            {t("revokeOthers")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

const LoadedSessions = () => {
  const sessions = useAtomValue(accountSessions);
  const current = useAtomValue(currentSession);
  const reload = useAtomRefresh(accountSessions);

  const token = AsyncResult.match(current, {
    onFailure: () => "",
    onInitial: () => "",
    onSuccess: ({ value }) => value.session.token,
  });

  return AsyncResult.match(sessions, {
    onFailure: () => <SettingsLoadFailed onRetry={reload} />,
    onInitial: () => <SettingsLoading />,
    onSuccess: ({ value }) => (
      <div className="flex flex-col gap-4">
        <ul className="divide-y">
          {value.map((session) => (
            <SessionRow
              key={session.id}
              current={session.token === token}
              session={session}
              onChanged={reload}
            />
          ))}
        </ul>
        {value.length > 1 ? (
          <div>
            <RevokeOthers onChanged={reload} />
          </div>
        ) : null}
      </div>
    ),
  });
};

/** The user's sessions, in the reader's time zone, once the page runs. */
export const SessionsList = () =>
  useHydrated() ? (
    <InTimeZone timeZone={browserTimeZone()}>
      <LoadedSessions />
    </InTimeZone>
  ) : (
    <SettingsLoading />
  );
