"use client";

import { useAtomRefresh, useAtomValue } from "@effect/atom-react";
import { Schema } from "effect";
import { AsyncResult } from "effect/reactivity";
import { useTranslations } from "next-intl";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "peal-ui/components/select";
import { useId, useTransition } from "react";
import { toast } from "sonner";

import { authClient } from "#auth/client.ts";
import { membersOf } from "#billing/members.ts";
import { useHydrated } from "#components/media/use-hydrated.ts";
import { workspaceMembers } from "#settings/atoms.ts";
import type { WorkspaceMember } from "#settings/atoms.ts";
import { settingsErrorKey } from "#settings/errors.ts";
import {
  mayRemove,
  ownersAmong,
  RoleSchema,
  rolesFor,
} from "#settings/member-rules.ts";
import type { Manager } from "#settings/member-rules.ts";

import { SettingsLoadFailed, SettingsLoading } from "./settings-status.tsx";

const isRole = Schema.is(RoleSchema);

interface MemberRowProps {
  readonly manager: Manager;
  readonly member: WorkspaceMember;
  readonly onChanged: () => void;
  readonly owners: number;
  /** Whether their account has two-step verification on, to a manager. */
  readonly twoStepEnabled: boolean | null;
  readonly workspaceId: string;
}

// One member: who they are, their role, which the manager may change, and
// removing them, once confirmed.
const MemberRow = ({
  manager,
  member,
  onChanged,
  owners,
  twoStepEnabled,
  workspaceId,
}: MemberRowProps) => {
  const twoStep = useTranslations("TwoStep");
  const t = useTranslations("WorkspaceSettings.members");
  const roleLabel = useTranslations("WorkspaceSettings");
  const settings = useTranslations("Settings");
  const errors = useTranslations("Settings.errors");
  const roleId = useId();
  const [isChanging, startChange] = useTransition();
  const [isRemoving, startRemove] = useTransition();
  const roles = rolesFor(manager, member, owners);
  const removable = mayRemove(manager, member, owners);
  const { email, name } = member.user;

  const handleRole = (role: string | null) => {
    if (role === null || !isRole(role) || role === member.role) {
      return;
    }

    startChange(async () => {
      const result = await authClient.organization.updateMemberRole({
        memberId: member.id,
        organizationId: workspaceId,
        role,
      });

      if (result.error === null) {
        toast.success(
          t("roleChanged", { name, role: roleLabel("role", { role }) })
        );
        onChanged();
      } else {
        toast.error(errors(settingsErrorKey(result.error)));
      }
    });
  };

  const handleRemove = () => {
    startRemove(async () => {
      const result = await authClient.organization.removeMember({
        memberIdOrEmail: member.id,
        organizationId: workspaceId,
      });

      if (result.error === null) {
        toast.success(t("removed", { name }));
        onChanged();
      } else {
        toast.error(errors(settingsErrorKey(result.error)));
      }
    });
  };

  return (
    <li className="flex flex-wrap items-center gap-4 py-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex flex-wrap items-center gap-2 font-medium">
          {name}
          {member.userId === manager.userId ? (
            <Badge variant="secondary">{t("you")}</Badge>
          ) : null}
        </span>
        <span className="text-muted-foreground truncate text-sm">{email}</span>
      </div>
      {twoStepEnabled === null ? null : (
        <Badge variant={twoStepEnabled ? "secondary" : "outline"}>
          {`${twoStep("memberColumn")}: ${twoStep("enabledBadge", { enabled: String(twoStepEnabled) })}`}
        </Badge>
      )}
      {roles.length === 0 || !isRole(member.role) ? (
        <Badge variant="outline">
          {roleLabel("role", { role: member.role })}
        </Badge>
      ) : (
        <>
          <span id={roleId} className="sr-only">
            {t("roleOf", { name })}
          </span>
          <Select
            value={member.role}
            disabled={isChanging}
            onValueChange={handleRole}
          >
            <SelectTrigger aria-labelledby={roleId}>
              <SelectValue>
                {roleLabel("role", { role: member.role })}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {roles.map((role) => (
                <SelectItem key={role} value={role}>
                  {roleLabel("role", { role })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      )}
      {removable ? (
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button
                variant="ghost"
                size="sm"
                disabled={isRemoving}
                focusableWhenDisabled
                aria-label={
                  isRemoving ? undefined : t("removeMember", { name })
                }
              />
            }
          >
            {isRemoving ? t("removing") : t("remove")}
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("removeTitle", { name })}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("removeDescription", { email })}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{settings("cancel")}</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={handleRemove}>
                {t("remove")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : null}
    </li>
  );
};

/**
 * The members, as the list shows them once loaded, and, to a reader who
 * manages members, whether each one's account has two-step verification
 * on (`twoStep`, by user id; null for anyone else).
 */
export const MembersView = ({
  manager,
  members,
  onChanged,
  twoStep = null,
  workspaceId,
}: {
  readonly manager: Manager;
  readonly members: readonly WorkspaceMember[];
  readonly onChanged: () => void;
  readonly twoStep?: ReadonlyMap<string, boolean> | null;
  readonly workspaceId: string;
}) => {
  const t = useTranslations("WorkspaceSettings.members");
  const owners = ownersAmong(members);

  return (
    <section aria-labelledby="members-title" className="flex flex-col gap-2">
      <h2 id="members-title" className="text-xl font-semibold">
        {t("listTitle", { count: members.length })}
      </h2>
      <ul className="divide-y">
        {members.map((member) => (
          <MemberRow
            key={member.id}
            manager={manager}
            member={member}
            owners={owners}
            twoStepEnabled={
              twoStep === null ? null : (twoStep.get(member.userId) ?? null)
            }
            workspaceId={workspaceId}
            onChanged={onChanged}
          />
        ))}
      </ul>
    </section>
  );
};

const LoadedMembers = ({
  manager,
  workspaceId,
}: {
  readonly manager: Manager;
  readonly workspaceId: string;
}) => {
  const atom = workspaceMembers(workspaceId);
  const result = useAtomValue(atom);
  const reload = useAtomRefresh(atom);
  // Peal's own list says who has two-step verification on, to who may
  // manage members alone.
  const listed = useAtomValue(membersOf(workspaceId));

  const twoStep = manager.mayUpdate
    ? AsyncResult.match(listed, {
        onFailure: () => null,
        onInitial: () => null,
        onSuccess: ({ value }) =>
          new Map(
            value.flatMap(({ twoStepEnabled, userId }) =>
              twoStepEnabled === undefined ? [] : [[userId, twoStepEnabled]]
            )
          ),
      })
    : null;

  return AsyncResult.match(result, {
    onFailure: () => <SettingsLoadFailed onRetry={reload} />,
    onInitial: () => <SettingsLoading />,
    onSuccess: ({ value }) => (
      <MembersView
        manager={manager}
        members={value.members}
        twoStep={twoStep}
        workspaceId={workspaceId}
        onChanged={reload}
      />
    ),
  });
};

/**
 * The workspace's members, read with the visitor's session once the page
 * runs, with what the manager may change.
 */
export const MembersList = ({
  manager,
  workspaceId,
}: {
  readonly manager: Manager;
  readonly workspaceId: string;
}) =>
  useHydrated() ? (
    <LoadedMembers manager={manager} workspaceId={workspaceId} />
  ) : (
    <SettingsLoading />
  );
