"use client";

import { DateTime } from "effect";
import { useFormatter, useTranslations } from "next-intl";
import type {
  ContractRequestOutcome,
  ContractRequestPreview,
} from "peal-contract";
import { Alert, AlertDescription } from "peal-ui/components/alert";
import { Button } from "peal-ui/components/button";

/** Where the person who followed a link is. */
export type ConfirmationState =
  | { readonly _tag: "loading" }
  | { readonly _tag: "missing" }
  | { readonly _tag: "notFound" }
  | { readonly _tag: "failed" }
  | { readonly _tag: "choosing"; readonly preview: ContractRequestPreview }
  | { readonly _tag: "done"; readonly outcome: ContractRequestOutcome };

export interface ContractConfirmationViewProps {
  readonly onApply: (workspaceId: string) => void;
  /** The contract being applied to, while it is. */
  readonly pending: string | null;
  /** Whether the last try could not reach Stripe. */
  readonly unavailable: boolean;
  readonly state: ConfirmationState;
}

const Outcome = ({ outcome }: { readonly outcome: ContractRequestOutcome }) => {
  const t = useTranslations("Contract.confirmation");
  const format = useFormatter();

  if (outcome.status !== "applied") {
    return (
      <Alert variant="destructive" aria-live="polite">
        <AlertDescription>
          {t("refused", { refusal: outcome.refusal ?? "other" })}
        </AlertDescription>
      </Alert>
    );
  }

  const refunded =
    outcome.refunded !== null && outcome.refunded.amount > 0
      ? t("refunded", {
          refund: format.number(outcome.refunded.amount / 100, {
            currency: outcome.refunded.currency.toUpperCase(),
            style: "currency",
          }),
        })
      : null;

  return (
    <Alert aria-live="polite">
      <AlertDescription>
        {t("applied", {
          // A request that was applied says when its contract ends.
          effectiveAt: DateTime.toDate(
            outcome.effectiveAt ?? outcome.receivedAt
          ),
          kind: outcome.kind,
        })}
        {refunded === null ? null : ` ${refunded}`}
      </AlertDescription>
    </Alert>
  );
};

const Choice = ({
  onApply,
  pending,
  preview,
}: Pick<ContractConfirmationViewProps, "onApply" | "pending"> & {
  readonly preview: ContractRequestPreview;
}) => {
  const t = useTranslations("Contract.confirmation");
  const plans = useTranslations("Billing");
  const { contracts, desiredOn, kind, receivedAt } = preview;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm">
        {t("request", { kind, receivedAt: DateTime.toDate(receivedAt) })}
      </p>
      {desiredOn === null ? null : (
        <p className="text-sm">
          {t("desiredOn", { date: DateTime.toDate(desiredOn) })}
        </p>
      )}
      {contracts.length === 0 ? (
        <Alert>
          <AlertDescription>{t("none")}</AlertDescription>
        </Alert>
      ) : (
        <ul className="flex flex-col gap-3">
          {contracts.map((contract) => (
            <li
              key={contract.workspaceId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"
            >
              <span className="text-sm font-medium">
                {t("contract", {
                  plan: plans("plan", { plan: contract.plan }),
                  trial: String(contract.trial),
                  workspace: contract.workspaceName,
                })}
              </span>
              <Button
                variant="destructive"
                disabled={pending !== null}
                focusableWhenDisabled
                onClick={() => {
                  onApply(contract.workspaceId);
                }}
              >
                {pending === contract.workspaceId
                  ? t("applying")
                  : t("apply", { kind })}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

/**
 * What the link emailed to a request's address opens: the request, the
 * contracts that address manages, each with the one action that applies
 * the request to it, then what became of it.
 */
export const ContractConfirmationView = ({
  onApply,
  pending,
  state,
  unavailable,
}: ContractConfirmationViewProps) => {
  const t = useTranslations("Contract");

  if (state._tag === "loading") {
    return <p className="text-muted-foreground text-sm" aria-busy />;
  }

  if (state._tag === "done") {
    return <Outcome outcome={state.outcome} />;
  }

  if (state._tag === "choosing") {
    return (
      <div className="flex flex-col gap-4">
        {unavailable ? (
          <Alert variant="destructive" aria-live="assertive">
            <AlertDescription>{t("errors.unavailable")}</AlertDescription>
          </Alert>
        ) : null}
        <Choice onApply={onApply} pending={pending} preview={state.preview} />
      </div>
    );
  }

  const messages = {
    failed: t("errors.generic"),
    missing: t("confirmation.missing"),
    notFound: t("confirmation.notFound"),
  } as const;

  return (
    <Alert variant={state._tag === "failed" ? "destructive" : "default"}>
      <AlertDescription>{messages[state._tag]}</AlertDescription>
    </Alert>
  );
};
