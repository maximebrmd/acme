"use client";

import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import { Schema } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useFormatter, useNow, useTranslations } from "next-intl";
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
import { Label } from "peal-ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "peal-ui/components/select";
import { useId, useState, useTransition } from "react";
import type { SubmitEvent } from "react";
import { toast } from "sonner";

import { authClient } from "#auth/client.ts";
import { FormField } from "#components/auth/form-field.tsx";
import { useHydrated } from "#components/media/use-hydrated.ts";
import { InTimeZone } from "#components/notices/in-time-zone.tsx";
import { browserTimeZone } from "#posts/zoned-time.ts";
import { workspaceInvitations } from "#settings/atoms.ts";
import type { WorkspaceInvitation } from "#settings/atoms.ts";
import { settingsErrorKey } from "#settings/errors.ts";
import type { SettingsErrorKey } from "#settings/errors.ts";
import { invite } from "#settings/invite.ts";
import { RoleSchema } from "#settings/member-rules.ts";
import type { Role } from "#settings/member-rules.ts";

import { SettingsError } from "./settings-error.tsx";
import { SettingsLoadFailed, SettingsLoading } from "./settings-status.tsx";

const isRole = Schema.is(RoleSchema);

/**
 * Invites someone by email with a role: Better Auth emails them a link, in
 * their language when they have an account, in the inviter's otherwise.
 */
export const InviteForm = ({
  roles,
  workspaceId,
}: {
  readonly roles: readonly Role[];
  readonly workspaceId: string;
}) => {
  const t = useTranslations("WorkspaceSettings.invitations");
  const roleLabel = useTranslations("WorkspaceSettings");
  const roleId = useId();
  const refresh = useAtomRefresh(workspaceInvitations(workspaceId));
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("editor");
  const [error, setError] = useState<SettingsErrorKey | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleRole = (value: string | null) => {
    if (value !== null && isRole(value)) {
      setRole(value);
    }
  };

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    startTransition(async () => {
      const invitee = email.trim();

      const result = await invite({
        email: invitee,
        organizationId: workspaceId,
        resend: false,
        role,
      });

      if (result.error === null) {
        setError(null);
        setEmail("");
        toast.success(t("sent", { email: invitee }));
        refresh();
      } else {
        setError(settingsErrorKey(result.error));
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-4">
      <SettingsError error={error} />
      <FormField
        id="invitee-email"
        type="email"
        autoComplete="off"
        label={t("email")}
        value={email}
        onChange={setEmail}
      />
      <div className="flex flex-col gap-2">
        <Label id={roleId}>{t("role")}</Label>
        <Select value={role} disabled={isPending} onValueChange={handleRole}>
          <SelectTrigger aria-labelledby={roleId}>
            <SelectValue>{roleLabel("role", { role })}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {roles.map((option) => (
              <SelectItem key={option} value={option}>
                {roleLabel("role", { role: option })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Button type="submit" disabled={isPending} focusableWhenDisabled>
          {isPending ? t("sending") : t("send")}
        </Button>
      </div>
    </form>
  );
};

interface InvitationRowProps {
  readonly invitation: WorkspaceInvitation;
  readonly mayCancel: boolean;
  readonly mayResend: boolean;
  readonly onChanged: () => void;
  readonly workspaceId: string;
}

// One pending invitation: who, as what, until when (Better Auth keeps an
// expired one pending, until it is sent again); sending it again, and
// revoking it once confirmed.
const InvitationRow = ({
  invitation,
  mayCancel,
  mayResend,
  onChanged,
  workspaceId,
}: InvitationRowProps) => {
  const t = useTranslations("WorkspaceSettings.invitations");
  const roleLabel = useTranslations("WorkspaceSettings");
  const settings = useTranslations("Settings");
  const errors = useTranslations("Settings.errors");
  const format = useFormatter();
  const now = useNow();
  const [isResending, startResend] = useTransition();
  const [isRevoking, startRevoke] = useTransition();
  const { email } = invitation;
  const role = invitation.role ?? "";
  const expired = invitation.expiresAt.getTime() <= now.getTime();

  const handleResend = () => {
    startResend(async () => {
      const result = await invite({
        email,
        organizationId: workspaceId,
        resend: true,
        role: isRole(role) ? role : "viewer",
      });

      if (result.error === null) {
        toast.success(t("resent", { email }));
        onChanged();
      } else {
        toast.error(errors(settingsErrorKey(result.error)));
      }
    });
  };

  const handleRevoke = () => {
    startRevoke(async () => {
      const result = await authClient.organization.cancelInvitation({
        invitationId: invitation.id,
      });

      if (result.error === null) {
        toast.success(t("revoked", { email }));
        onChanged();
      } else {
        toast.error(errors(settingsErrorKey(result.error)));
      }
    });
  };

  return (
    <li className="flex flex-wrap items-center gap-4 py-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="truncate font-medium">{email}</span>
        <span className="text-muted-foreground text-sm">
          {t(expired ? "expired" : "expires", {
            date: format.dateTime(invitation.expiresAt, {
              dateStyle: "medium",
              timeStyle: "short",
            }),
          })}
        </span>
      </div>
      <Badge variant="outline">{roleLabel("role", { role })}</Badge>
      <div className="flex gap-2">
        {mayResend ? (
          <Button
            variant="outline"
            size="sm"
            disabled={isResending}
            focusableWhenDisabled
            aria-label={isResending ? undefined : t("resendTo", { email })}
            onClick={handleResend}
          >
            {isResending ? t("resending") : t("resend")}
          </Button>
        ) : null}
        {mayCancel ? (
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isRevoking}
                  focusableWhenDisabled
                  aria-label={
                    isRevoking ? undefined : t("revokeFor", { email })
                  }
                />
              }
            >
              {isRevoking ? t("revoking") : t("revoke")}
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t("revokeTitle", { email })}
                </AlertDialogTitle>
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
        ) : null}
      </div>
    </li>
  );
};

const LoadedInvitations = ({
  mayCancel,
  mayResend,
  workspaceId,
}: {
  readonly mayCancel: boolean;
  readonly mayResend: boolean;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("WorkspaceSettings.invitations");
  const atom = workspaceInvitations(workspaceId);
  const result = useAtomValue(atom);
  const reload = useAtomRefresh(atom);

  return AsyncResult.match(result, {
    onFailure: () => <SettingsLoadFailed onRetry={reload} />,
    onInitial: () => <SettingsLoading />,
    onSuccess: ({ value }) => {
      const pending = value.filter(({ status }) => status === "pending");

      return pending.length === 0 ? (
        <p className="text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="divide-y">
          {pending.map((invitation) => (
            <InvitationRow
              key={invitation.id}
              invitation={invitation}
              mayCancel={mayCancel}
              mayResend={mayResend}
              workspaceId={workspaceId}
              onChanged={reload}
            />
          ))}
        </ul>
      );
    },
  });
};

/** The invitations still waiting for an answer, in the reader's time zone. */
export const PendingInvitations = ({
  mayCancel,
  mayResend,
  workspaceId,
}: {
  readonly mayCancel: boolean;
  readonly mayResend: boolean;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("WorkspaceSettings.invitations");

  return (
    <section aria-labelledby="pending-title" className="flex flex-col gap-2">
      <h2 id="pending-title" className="text-xl font-semibold">
        {t("pendingTitle")}
      </h2>
      {useHydrated() ? (
        <InTimeZone timeZone={browserTimeZone()}>
          <LoadedInvitations
            mayCancel={mayCancel}
            mayResend={mayResend}
            workspaceId={workspaceId}
          />
        </InTimeZone>
      ) : (
        <SettingsLoading />
      )}
    </section>
  );
};
