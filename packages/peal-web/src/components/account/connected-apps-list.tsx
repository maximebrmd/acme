"use client";

import { useAtomRefresh, useAtomSet, useAtomValue } from "@effect/atom-react";
import { cliClientId } from "peal-contract";
import type { ConnectedApp } from "peal-contract";
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
import { DateTime, Option } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useFormatter, useTranslations } from "next-intl";
import { useTransition } from "react";
import { toast } from "sonner";

import { useHydrated } from "#components/media/use-hydrated.ts";
import { InTimeZone } from "#components/notices/in-time-zone.tsx";
import {
  SettingsLoadFailed,
  SettingsLoading,
} from "#components/settings/settings-status.tsx";
import { browserTimeZone } from "#posts/zoned-time.ts";
import {
  connectedApps,
  connectedAppsChanged,
  revokeConnectedApp,
} from "#settings/atoms.ts";
import { apiErrorKey } from "#settings/errors.ts";

// One application: its name, what it may do and where, since when, and
// revoking it once confirmed.
const AppRow = ({ app }: { readonly app: ConnectedApp }) => {
  const t = useTranslations("AccountSettings.apps");
  const settings = useTranslations("Settings");
  const errors = useTranslations("Settings.errors");
  const format = useFormatter();
  const revoke = useAtomSet(revokeConnectedApp, { mode: "promiseExit" });
  const [isRevoking, startRevoke] = useTransition();

  const name =
    app.clientId === cliClientId ? t("cli") : (app.name ?? app.clientId);

  const when = (instant: DateTime.Utc) =>
    format.dateTime(DateTime.toDate(instant), { dateStyle: "medium" });

  const workspaces = app.workspaces.map(
    (workspace) => workspace.name ?? workspace.id
  );

  const handleRevoke = () => {
    startRevoke(async () => {
      const exit = await revoke({
        params: { clientId: app.clientId },
        reactivityKeys: connectedAppsChanged,
      });

      Option.match(apiErrorKey(exit), {
        onNone: () => {
          toast.success(t("revoked", { name }));
        },
        onSome: (key) => {
          toast.error(errors(key));
        },
      });
    });
  };

  return (
    <li className="flex flex-wrap items-start gap-4 py-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="font-medium">{name}</span>
        <span className="text-muted-foreground text-sm">
          {workspaces.length === 0
            ? t("anyWorkspace")
            : t("workspaces", {
                names: format.list(workspaces, { type: "conjunction" }),
              })}
        </span>
        <span className="text-muted-foreground text-sm">
          {t("dates", {
            authorized: when(app.authorizedAt),
            lastUsed: app.lastUsedAt === null ? "never" : when(app.lastUsedAt),
          })}
        </span>
        <span className="text-muted-foreground font-mono text-xs">
          {app.scopes.join(" ")}
        </span>
      </div>
      <AlertDialog>
        <AlertDialogTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              disabled={isRevoking}
              focusableWhenDisabled
              aria-label={isRevoking ? undefined : t("revokeApp", { name })}
            />
          }
        >
          {isRevoking ? t("revoking") : t("revoke")}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("revokeTitle", { name })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("revokeDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{settings("cancel")}</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleRevoke}>
              {t("revoke")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
};

const LoadedApps = () => {
  const t = useTranslations("AccountSettings.apps");
  const result = useAtomValue(connectedApps);
  const reload = useAtomRefresh(connectedApps);

  return AsyncResult.match(result, {
    onFailure: () => <SettingsLoadFailed onRetry={reload} />,
    onInitial: () => <SettingsLoading />,
    onSuccess: ({ value }) =>
      value.length === 0 ? (
        <p className="text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="divide-y">
          {value.map((app) => (
            <AppRow key={app.clientId} app={app} />
          ))}
        </ul>
      ),
  });
};

/**
 * The applications acting for the user through OAuth, such as the command
 * line and MCP clients, in the reader's time zone, once the page runs.
 */
export const ConnectedAppsList = () =>
  useHydrated() ? (
    <InTimeZone timeZone={browserTimeZone()}>
      <LoadedApps />
    </InTimeZone>
  ) : (
    <SettingsLoading />
  );
