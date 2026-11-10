"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Alert, AlertDescription, AlertTitle } from "peal-ui/components/alert";
import { Button } from "peal-ui/components/button";
import { Input } from "peal-ui/components/input";
import { Label } from "peal-ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "peal-ui/components/select";
import { useId } from "react";
import type { ReactNode, SubmitEvent } from "react";

import type {
  FunctionError,
  FunctionKind,
  FunctionStep,
  FunctionValues,
  InvalidField,
  OwnContract,
} from "#contract/form.ts";

export interface ContractFunctionViewProps {
  /** The Turnstile widget, when the request needs one. */
  readonly captcha: ReactNode;
  readonly error: FunctionError | null;
  readonly invalid: readonly InvalidField[];
  readonly kind: FunctionKind;
  readonly onBack: () => void;
  readonly onChange: (values: FunctionValues) => void;
  readonly onContinue: () => void;
  readonly onNotify: () => void;
  /** The contracts the signed-in member manages: none when signed out. */
  readonly own: readonly OwnContract[];
  readonly pending: boolean;
  /** Whether the final step may be sent: the captcha passed, if any. */
  readonly ready: boolean;
  /** The signed-in member's address, or null. */
  readonly signedInAs: string | null;
  readonly step: FunctionStep;
  /** Today, as `2026-11-10`: the first day that can be asked for. */
  /** The latest day a cancellation may ask for, as YYYY-MM-DD. */
  readonly latest: string;
  readonly today: string;
  readonly values: FunctionValues;
}

const other = "other";

const functionOf = (kind: FunctionKind) =>
  kind === "cancellation" ? "cancel" : "withdraw";

// Money in the reader's way of writing it.
const useMoney = () => {
  const format = useFormatter();

  return ({
    amount,
    currency,
  }: {
    readonly amount: number;
    readonly currency: string;
  }) =>
    format.number(amount / 100, {
      currency: currency.toUpperCase(),
      style: "currency",
    });
};

const Field = ({
  autoComplete,
  hint,
  invalid,
  label,
  onChange,
  required,
  type,
  value,
  ...rest
}: {
  readonly autoComplete: string;
  readonly hint?: string;
  readonly invalid?: string;
  readonly label: string;
  readonly max?: string;
  readonly min?: string;
  readonly onChange: (value: string) => void;
  readonly required: boolean;
  readonly type: "date" | "email" | "text";
  readonly value: string;
}) => {
  const id = useId();

  const described = [
    hint === undefined ? null : `${id}-hint`,
    invalid === undefined ? null : `${id}-invalid`,
  ]
    .filter((part) => part !== null)
    .join(" ");

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        required={required}
        aria-invalid={invalid !== undefined}
        aria-describedby={described === "" ? undefined : described}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        {...rest}
      />
      {hint === undefined ? null : (
        <p id={`${id}-hint`} className="text-muted-foreground text-xs">
          {hint}
        </p>
      )}
      {invalid === undefined ? null : (
        <p id={`${id}-invalid`} className="text-destructive text-xs">
          {invalid}
        </p>
      )}
    </div>
  );
};

// The contract: one of the member's own, picked from a list, or any other,
// written by its number or its workspace's name.
const ContractRubric = ({
  invalid,
  onChange,
  own,
  values,
}: Pick<
  ContractFunctionViewProps,
  "invalid" | "onChange" | "own" | "values"
>) => {
  const t = useTranslations("Contract");
  const labelId = useId();
  const chosen = own.find(({ id }) => id === values.workspaceId);

  const written = (
    <Field
      type="text"
      autoComplete="off"
      required={false}
      label={t("fields.contract")}
      hint={t("fields.contractHint")}
      value={values.contract}
      {...(invalid.includes("contract")
        ? { invalid: t("invalid.contract") }
        : {})}
      onChange={(contract) => {
        onChange({ ...values, contract });
      }}
    />
  );

  if (own.length === 0) {
    return written;
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        <Label id={labelId}>{t("fields.contractChoice")}</Label>
        <Select
          value={values.workspaceId ?? other}
          onValueChange={(value) => {
            onChange({
              ...values,
              workspaceId: value === other ? null : value,
            });
          }}
        >
          <SelectTrigger aria-labelledby={labelId}>
            <SelectValue>
              {chosen === undefined
                ? t("fields.contractOther")
                : t("fields.contractOf", { workspace: chosen.name })}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {own.map(({ id, name }) => (
              <SelectItem key={id} value={id}>
                {t("fields.contractOf", { workspace: name })}
              </SelectItem>
            ))}
            <SelectItem value={other}>{t("fields.contractOther")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {chosen === undefined ? written : null}
    </>
  );
};

const Rubrics = ({
  invalid,
  kind,
  onChange,
  onContinue,
  own,
  signedInAs,
  latest,
  today,
  values,
}: ContractFunctionViewProps) => {
  const t = useTranslations("Contract");

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    onContinue();
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {signedInAs === null ? null : (
        <p className="text-muted-foreground text-sm">
          {t("signedInAs", { email: signedInAs })}
        </p>
      )}
      <Field
        type="text"
        autoComplete="name"
        required
        label={t("fields.name")}
        value={values.name}
        {...(invalid.includes("name") ? { invalid: t("invalid.name") } : {})}
        onChange={(name) => {
          onChange({ ...values, name });
        }}
      />
      <Field
        type="email"
        autoComplete="email"
        required
        label={t("fields.email")}
        hint={t("fields.emailHint")}
        value={values.email}
        {...(invalid.includes("email") ? { invalid: t("invalid.email") } : {})}
        onChange={(email) => {
          onChange({ ...values, email });
        }}
      />
      <ContractRubric
        invalid={invalid}
        own={own}
        values={values}
        onChange={onChange}
      />
      {kind === "cancellation" ? (
        <Field
          type="date"
          autoComplete="off"
          required={false}
          min={today}
          max={latest}
          label={t("fields.desiredOn")}
          hint={t("fields.desiredOnHint")}
          value={values.desiredOn}
          onChange={(desiredOn) => {
            onChange({ ...values, desiredOn });
          }}
        />
      ) : null}
      <div>
        <Button type="submit">{t("continue")}</Button>
      </div>
    </form>
  );
};

// The summary, to check and modify, then the one action that notifies.
const Summary = ({
  captcha,
  kind,
  onBack,
  onNotify,
  own,
  pending,
  ready,
  refund,
  values,
}: ContractFunctionViewProps & { readonly refund: FunctionStepRefund }) => {
  const t = useTranslations("Contract");
  const format = useFormatter();
  const money = useMoney();
  const name = functionOf(kind);
  const chosen = own.find(({ id }) => id === values.workspaceId);

  const contract =
    chosen?.name ??
    (values.contract.trim() === ""
      ? t("summary.contractNotGiven")
      : values.contract.trim());

  const rows: [string, string][] = [
    [t("summary.name"), values.name.trim()],
    [t("summary.email"), values.email.trim()],
    [t("summary.contract"), contract],
  ];

  if (kind === "cancellation") {
    rows.push([
      t("summary.desiredOn"),
      values.desiredOn === ""
        ? t("summary.desiredOnNone")
        : format.dateTime(new Date(`${values.desiredOn}T00:00:00Z`), {
            dateStyle: "long",
            timeZone: "UTC",
          }),
    ]);
  }

  if (refund !== null) {
    rows.push([t("summary.refund"), money(refund)]);
  }

  return (
    <section className="flex flex-col gap-4" aria-labelledby="contract-summary">
      <h2 id="contract-summary" className="text-lg font-semibold">
        {t(`${name}.summaryTitle`)}
      </h2>
      <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
        {rows.map(([term, value]) => (
          <div key={term} className="contents">
            <dt className="text-muted-foreground">{term}</dt>
            <dd className="break-words">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-muted-foreground text-sm">
        {t("summary.effect", { kind })}
      </p>
      {captcha}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="destructive"
          disabled={pending || !ready}
          focusableWhenDisabled
          onClick={onNotify}
        >
          {pending ? t(`${name}.notifying`) : t(`${name}.notify`)}
        </Button>
        <Button variant="outline" disabled={pending} onClick={onBack}>
          {t("modify")}
        </Button>
      </div>
    </section>
  );
};

type FunctionStepRefund = Extract<
  FunctionStep,
  { readonly _tag: "summary" }
>["refund"];

const Done = ({
  kind,
  step,
  values,
}: Pick<ContractFunctionViewProps, "kind" | "step" | "values">) => {
  const t = useTranslations("Contract");
  const money = useMoney();

  if (step._tag === "form" || step._tag === "summary") {
    return null;
  }

  return (
    <Alert aria-live="polite">
      <AlertTitle>{t(`${functionOf(kind)}.doneTitle`)}</AlertTitle>
      <AlertDescription>
        {step._tag === "received"
          ? t("done.received", {
              email: values.email.trim(),
              receivedAt: step.receivedAt,
            })
          : null}
        {step._tag === "cancelled"
          ? t("done.cancelled", { endsAt: step.endsAt })
          : null}
        {step._tag === "withdrawn"
          ? t("done.withdrawn", { refund: money(step.refunded) })
          : null}
      </AlertDescription>
    </Alert>
  );
};

/**
 * The function to cancel a contract, or to withdraw from one, as French
 * law lays it out: the rubrics that identify the person and the contract,
 * to fill or confirm; a summary to check and modify; then the one action
 * that notifies, under the words the law gives it; and what was received.
 */
export const ContractFunctionView = (props: ContractFunctionViewProps) => {
  const { error, step } = props;
  const t = useTranslations("Contract");

  return (
    <div className="flex flex-col gap-6">
      {error === null ? null : (
        <Alert variant="destructive" aria-live="assertive">
          <AlertDescription>{t(`errors.${error}`)}</AlertDescription>
        </Alert>
      )}
      {step._tag === "form" ? <Rubrics {...props} /> : null}
      {step._tag === "summary" ? (
        <Summary {...props} refund={step.refund} />
      ) : null}
      <Done {...props} />
    </div>
  );
};
