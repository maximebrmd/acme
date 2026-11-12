"use client";

import { useFormatter, useTranslations } from "next-intl";
import type { Standing } from "peal-contract";
import { Alert, AlertDescription } from "peal-ui/components/alert";
import { Button } from "peal-ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "peal-ui/components/card";
import { Checkbox } from "peal-ui/components/checkbox";
import { Label } from "peal-ui/components/label";
import { useId } from "react";
import type { ReactNode } from "react";

import { ExcessList } from "#components/billing/excess-list.tsx";

/** A channel to keep or let go. */
export interface HeldChannel {
  readonly id: string;
  /** The account, as people mention it. */
  readonly name: string;
  readonly platform: string;
}

/** A member to keep or let go. */
export interface HeldMember {
  readonly name: string;
  /** Their role, as it is stored. */
  readonly role: string;
  readonly userId: string;
}

/** Why choosing what stays was refused. */
export type OverPlanError =
  | "forbidden"
  | "generic"
  | "ownerRequired"
  | "payerRequired"
  | "selfRequired"
  | "tooManyChannels"
  | "tooManyMembers"
  | "unknownChannel"
  | "unknownMember";

export interface OverPlanViewProps {
  /** Whether the choice is being applied. */
  readonly applying: boolean;
  /** The link to the workspace's billing page. */
  readonly billingLink: ReactNode;
  /** Whether the member orders a plan and chooses what stays. */
  readonly canManage: boolean;
  readonly channels: readonly HeldChannel[];
  /** Whether the box saying what is removed is ticked. */
  readonly confirmed: boolean;
  readonly error: OverPlanError | null;
  readonly keptChannels: readonly string[];
  readonly keptMembers: readonly string[];
  /** The names of those who can fix it, for the other members. */
  readonly managers: readonly string[];
  readonly members: readonly HeldMember[];
  readonly onApply: () => void;
  readonly onConfirm: (confirmed: boolean) => void;
  readonly onKeepChannel: (channelId: string, kept: boolean) => void;
  readonly onKeepMember: (userId: string, kept: boolean) => void;
  /** The member reading, who always stays. */
  readonly self: string;
  readonly standing: Standing;
  /** The upgrade offer, for a member who manages billing. */
  readonly upgrade: ReactNode;
  readonly workspaceName: string;
}

const allowedOf = (standing: Standing, limit: "channels" | "members") =>
  standing.over.find((excess) => excess.limit === limit)?.allowed ?? null;

const Choice = ({
  checked,
  disabled,
  label,
  onChange,
}: {
  readonly checked: boolean;
  readonly disabled: boolean;
  readonly label: string;
  readonly onChange: (checked: boolean) => void;
}) => {
  const id = useId();

  return (
    <li className="flex items-center gap-3">
      <Checkbox
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(next) => {
          onChange(next);
        }}
      />
      <Label htmlFor={id}>{label}</Label>
    </li>
  );
};

const Choosing = ({
  applying,
  channels,
  confirmed,
  keptChannels,
  keptMembers,
  members,
  onApply,
  onConfirm,
  onKeepChannel,
  onKeepMember,
  self,
  standing,
}: OverPlanViewProps) => {
  const t = useTranslations("OverPlan");
  const confirmId = useId();
  const channelsAllowed = allowedOf(standing, "channels");
  const membersAllowed = allowedOf(standing, "members");

  const tooMany =
    (channelsAllowed !== null && keptChannels.length > channelsAllowed) ||
    (membersAllowed !== null && keptMembers.length > membersAllowed);

  const leaving = {
    channels:
      channelsAllowed === null ? 0 : channels.length - keptChannels.length,
    members: membersAllowed === null ? 0 : members.length - keptMembers.length,
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{t("chooseTitle")}</h2>
        </CardTitle>
        <CardDescription>{t("chooseDescription")}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-6">
          {channelsAllowed === null ? null : (
            <fieldset className="flex flex-col gap-2">
              <legend className="font-medium">
                {t("channels", {
                  allowed: channelsAllowed,
                  kept: keptChannels.length,
                })}
              </legend>
              <ul className="flex flex-col gap-2">
                {channels.map(({ id, name }) => (
                  <Choice
                    key={id}
                    checked={keptChannels.includes(id)}
                    disabled={applying}
                    label={name}
                    onChange={(kept) => {
                      onKeepChannel(id, kept);
                    }}
                  />
                ))}
              </ul>
              <p className="text-muted-foreground text-xs">
                {t("channelsNote")}
              </p>
            </fieldset>
          )}
          {membersAllowed === null ? null : (
            <fieldset className="flex flex-col gap-2">
              <legend className="font-medium">
                {t("members", {
                  allowed: membersAllowed,
                  kept: keptMembers.length,
                })}
              </legend>
              <ul className="flex flex-col gap-2">
                {members.map(({ name, role, userId }) => (
                  <Choice
                    key={userId}
                    checked={keptMembers.includes(userId)}
                    disabled={applying || userId === self}
                    label={`${name} (${userId === self ? t("you") : t("role", { role })})`}
                    onChange={(kept) => {
                      onKeepMember(userId, kept);
                    }}
                  />
                ))}
              </ul>
              <p className="text-muted-foreground text-xs">
                {t("membersNote")}
              </p>
            </fieldset>
          )}
          <div className="flex items-start gap-3">
            <Checkbox
              id={confirmId}
              checked={confirmed}
              disabled={applying}
              onCheckedChange={(next) => {
                onConfirm(next);
              }}
            />
            <Label htmlFor={confirmId}>{t("confirm", leaving)}</Label>
          </div>
          {tooMany ? (
            <p className="text-destructive text-sm">{t("tooMany")}</p>
          ) : null}
        </div>
      </CardContent>
      <CardFooter>
        <Button
          variant="destructive"
          disabled={!confirmed || tooMany || applying}
          focusableWhenDisabled
          onClick={onApply}
        >
          {applying ? t("applying") : t("apply")}
        </Button>
      </CardFooter>
    </Card>
  );
};

/**
 * What every member reads on entering a workspace that holds more than its
 * plan allows, as after its trial: what it holds beyond the plan, that
 * nothing goes out until it is back within it, and what becomes of the
 * posts already scheduled. Those who manage billing get the upgrade offer
 * first, then the choice of which channels and members stay, removed in
 * one confirmed step; the others read who can fix it.
 */
export const OverPlanView = (props: OverPlanViewProps) => {
  const {
    billingLink,
    canManage,
    error,
    managers,
    standing,
    upgrade,
    workspaceName,
  } = props;

  const t = useTranslations("OverPlan");
  const billing = useTranslations("Billing");
  const format = useFormatter();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight">
          {t("title", { workspace: workspaceName })}
        </h1>
        <p className="text-muted-foreground">
          {t("description", {
            plan: billing("plan", { plan: standing.plan ?? "free" }),
          })}
        </p>
      </div>
      <ExcessList excesses={standing.over} namespace="OverPlan" />
      {standing.account.otherWorkspaces.length === 0 ? null : (
        <p className="text-sm">
          {t("sharedAccount", {
            workspaces: format.list(
              standing.account.otherWorkspaces.map(({ name }) => name),
              { type: "conjunction" }
            ),
          })}
        </p>
      )}
      <p className="text-sm">
        {t("posts", { count: standing.scheduledPosts })}
      </p>
      {error === null ? null : (
        <Alert variant="destructive" aria-live="assertive">
          <AlertDescription>{t(`errors.${error}`)}</AlertDescription>
        </Alert>
      )}
      {canManage ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>{t("upgradeTitle")}</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {standing.planWithRoom === null ? (
                <p className="text-sm">{t("noPlan")}</p>
              ) : (
                upgrade
              )}
            </CardContent>
            <CardFooter>{billingLink}</CardFooter>
          </Card>
          <Choosing {...props} />
        </>
      ) : (
        <p className="text-sm">
          {managers.length === 0
            ? t("othersUnknown")
            : t("others", {
                names: managers.join(", "),
                workspace: workspaceName,
              })}
        </p>
      )}
    </div>
  );
};
