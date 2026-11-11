"use client";

import { useTranslations } from "next-intl";
import { Alert, AlertDescription } from "peal-ui/components/alert";
import { Badge } from "peal-ui/components/badge";
import { Button } from "peal-ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "peal-ui/components/dialog";
import type { ReactNode } from "react";

/** What the security page knows of the workspace and of who reads it. */
export interface WorkspaceSecurityState {
  /** A link to the reader's account page, which the page gives. */
  readonly accountLink: ReactNode;
  /** Whether the confirmation is open. */
  readonly confirming: boolean;
  /** Why the last change was refused, in the reader's words. */
  readonly error: string | null;
  /** Whether the reader may change it: an owner, in person. */
  readonly mayChange: boolean;
  /** Whether the reader's own account has two-step verification on. */
  readonly ownEnabled: boolean;
  readonly pending: boolean;
  readonly required: boolean;
  /**
   * The members whose account does not have it on, by name, for a reader
   * who manages members; null otherwise.
   */
  readonly without: readonly string[] | null;
}

export interface WorkspaceSecurityHandlers {
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
  readonly onRequire: () => void;
  readonly onStop: () => void;
}

/**
 * What requiring it means, before an owner confirms: who loses access at
 * once, by name, and that the workspace's API keys keep working.
 */
export const RequireConfirmation = ({
  without,
}: {
  readonly without: readonly string[];
}) => {
  const t = useTranslations("TwoStep");

  return without.length === 0
    ? t("requireConfirmNobody")
    : t("requireConfirm", {
        count: without.length,
        names: without.join(", "),
      });
};

/**
 * Whether the workspace requires two-step verification of every member:
 * owners require it once their own account has it on, after a
 * confirmation that names who loses access; anyone else reads it.
 */
export const WorkspaceSecurityView = ({
  accountLink,
  confirming,
  error,
  mayChange,
  onCancel,
  onConfirm,
  onRequire,
  onStop,
  ownEnabled,
  pending,
  required,
  without,
}: WorkspaceSecurityHandlers & WorkspaceSecurityState) => {
  const t = useTranslations("TwoStep");
  const lacking = without ?? [];

  return (
    <section
      aria-labelledby="two-step-requirement"
      className="flex flex-col gap-4"
    >
      <h2 id="two-step-requirement" className="text-xl font-semibold">
        {t("requireLabel")}
      </h2>
      <p className="flex flex-wrap items-center gap-2">
        <Badge variant={required ? "default" : "outline"}>
          {required ? t("on") : t("off")}
        </Badge>
        <span className="text-sm">
          {required ? t("requireOn") : t("requireOff")}
        </span>
      </p>
      {without === null ? null : (
        <p className="text-muted-foreground text-sm">
          {t("membersWithout", { count: without.length })}
        </p>
      )}
      {error === null ? null : (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {mayChange ? null : (
        <p className="text-muted-foreground text-sm">
          {t("requireOwnersOnly")}
        </p>
      )}
      {mayChange && !required && !ownEnabled ? (
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm">{t("requireOwnFirst")}</p>
          {accountLink}
        </div>
      ) : null}
      {mayChange && !required && ownEnabled ? (
        <div>
          <Button disabled={pending} focusableWhenDisabled onClick={onRequire}>
            {t("requireConfirmAction")}
          </Button>
        </div>
      ) : null}
      {mayChange && required ? (
        <div>
          <Button
            variant="outline"
            disabled={pending}
            focusableWhenDisabled
            onClick={onStop}
          >
            {t("stopRequiring")}
          </Button>
        </div>
      ) : null}
      <Dialog open={confirming} onOpenChange={onCancel}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("requireConfirmTitle")}</DialogTitle>
            <DialogDescription>
              <RequireConfirmation without={lacking} />
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={onCancel}>
              {t("cancel")}
            </Button>
            <Button
              disabled={pending}
              focusableWhenDisabled
              onClick={onConfirm}
            >
              {pending ? t("pending") : t("requireConfirmAction")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
};
