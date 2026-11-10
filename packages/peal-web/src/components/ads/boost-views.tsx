"use client";

import { DateTime } from "effect";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import {
  dailyOverspendPercent,
  maxBoostAge,
  maxBoostCountries,
  maxBoostPartyLength,
  maxBoostRunDays,
  minBoostAge,
} from "peal-contract";
import type { AdAccount, BoostQuoteSchema, NewBoost } from "peal-contract";
import { Alert, AlertDescription } from "peal-ui/components/alert";
import { Button } from "peal-ui/components/button";
import { Checkbox } from "peal-ui/components/checkbox";
import { Input } from "peal-ui/components/input";
import { Label } from "peal-ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "peal-ui/components/select";
import type { ReactNode, SubmitEvent } from "react";

import { targetsEu } from "#ads/boost-draft.ts";
import type { BoostDraft, BoostProblem } from "#ads/boost-draft.ts";
import type { AdsError } from "#ads/errors.ts";
import { useMoney } from "#ads/use-money.ts";

import { AdsErrorAlert } from "./ads-error.tsx";

// The boost dialog's views: the form, and the summary a person reads
// before anything is spent. Their state lives in boost-dialog.tsx.

type BoostQuote = typeof BoostQuoteSchema.Type;

const kinds = ["total", "daily"] as const;

const Field = ({
  children,
  hint,
  id,
  label,
  problem,
}: {
  readonly children: ReactNode;
  readonly hint?: string;
  readonly id: string;
  readonly label: string;
  /** What is wrong with the field, in words, when something is. */
  readonly problem?: string | undefined;
}) => (
  <div className="flex flex-col gap-2">
    <Label htmlFor={id}>{label}</Label>
    {children}
    {hint === undefined ? null : (
      <p id={`${id}-hint`} className="text-muted-foreground text-xs">
        {hint}
      </p>
    )}
    {problem === undefined ? null : (
      <p id={`${id}-problem`} className="text-destructive text-xs" role="alert">
        {problem}
      </p>
    )}
  </div>
);

interface BoostFormViewProps {
  /** The ad accounts an owner allowed to spend. */
  readonly accounts: readonly AdAccount[];
  /** A link to the ads page, where an owner allows an account to spend. */
  readonly adsLink: ReactNode;
  readonly draft: BoostDraft;
  /** Why checking the boost with the server failed last. */
  readonly error: AdsError | null;
  /** Tells this form's fields from another's on the page. */
  readonly idPrefix: string;
  readonly onChange: (draft: BoostDraft) => void;
  readonly onReview: () => void;
  readonly pending: boolean;
  /** The fields at fault, once the person asked for the review. */
  readonly problems: readonly BoostProblem[];
}

/**
 * The boost form: the ad account, the budget, the run, the audience, who
 * benefits and who pays for an audience in the European Union, and the
 * declaration without which nothing is sent. With no account allowed to
 * spend, it says who allows one, and where.
 */
export const BoostFormView = ({
  accounts,
  adsLink,
  draft,
  error,
  idPrefix,
  onChange,
  onReview,
  pending,
  problems,
}: BoostFormViewProps) => {
  const t = useTranslations("Ads.boost");
  const account = accounts.find(({ id }) => id === draft.accountId);
  const inEu = targetsEu(draft.countries);
  const id = (field: string) => `${idPrefix}-boost-${field}`;

  const problemOf = (...among: readonly BoostProblem[]) => {
    const found = among.find((problem) => problems.includes(problem));

    return found === undefined
      ? undefined
      : t("problem", {
          max: maxBoostAge,
          maxCountries: maxBoostCountries,
          min: minBoostAge,
          problem: found,
        });
  };

  const invalid = (...among: readonly BoostProblem[]) =>
    among.some((problem) => problems.includes(problem)) ? true : undefined;

  const text = (field: keyof BoostDraft) => (value: string) => {
    onChange({ ...draft, [field]: value });
  };

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    onReview();
  };

  if (accounts.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm">{t("noAccount")}</p>
        {adsLink}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <AdsErrorAlert
        error={error}
        digits={account === undefined ? 2 : account.minorUnitDigits}
      />
      <Field
        id={id("account")}
        label={t("account")}
        problem={problemOf("account")}
      >
        <Select
          value={draft.accountId}
          disabled={pending}
          onValueChange={(value) => {
            onChange({ ...draft, accountId: String(value) });
          }}
        >
          <SelectTrigger id={id("account")} aria-invalid={invalid("account")}>
            <SelectValue>
              {account === undefined
                ? t("accountPlaceholder")
                : t("accountChoice", {
                    currency: account.currency,
                    name: account.name,
                  })}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {accounts.map((choice) => (
              <SelectItem key={choice.id} value={choice.id}>
                {t("accountChoice", {
                  currency: choice.currency,
                  name: choice.name,
                })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={id("kind")} label={t("kind")}>
          <Select
            value={draft.kind}
            disabled={pending}
            onValueChange={(value) => {
              onChange({
                ...draft,
                kind: value === "daily" ? "daily" : "total",
              });
            }}
          >
            <SelectTrigger id={id("kind")}>
              <SelectValue>{t("kindValue", { kind: draft.kind })}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {kinds.map((kind) => (
                <SelectItem key={kind} value={kind}>
                  {t("kindValue", { kind })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field
          id={id("amount")}
          label={
            account === undefined
              ? t("amountNoCurrency")
              : t("amount", { currency: account.currency })
          }
          problem={problemOf("amount")}
        >
          <Input
            id={id("amount")}
            type="text"
            inputMode={account?.minorUnitDigits === 0 ? "numeric" : "decimal"}
            autoComplete="off"
            value={draft.amount}
            disabled={pending}
            aria-invalid={invalid("amount")}
            required
            onChange={(event) => {
              text("amount")(event.target.value);
            }}
          />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id={id("start")}
          label={t("start")}
          hint={t("startHint")}
          problem={problemOf("start")}
        >
          <Input
            id={id("start")}
            type="date"
            value={draft.startDate}
            disabled={pending}
            aria-describedby={`${id("start")}-hint`}
            aria-invalid={invalid("start")}
            onChange={(event) => {
              text("startDate")(event.target.value);
            }}
          />
        </Field>
        <Field
          id={id("end")}
          label={t("end")}
          hint={t("endHint", {
            max: maxBoostRunDays,
            zone:
              account === undefined
                ? ""
                : account.timeZone.replaceAll("_", " "),
            zoned: account === undefined ? "false" : "true",
          })}
          problem={problemOf("end", "endBeforeStart")}
        >
          <Input
            id={id("end")}
            type="date"
            value={draft.endDate}
            disabled={pending}
            aria-describedby={`${id("end")}-hint`}
            aria-invalid={invalid("end", "endBeforeStart")}
            required
            onChange={(event) => {
              text("endDate")(event.target.value);
            }}
          />
        </Field>
      </div>
      <Field
        id={id("countries")}
        label={t("countries")}
        hint={t("countriesHint", { max: maxBoostCountries })}
        problem={problemOf("countries")}
      >
        <Input
          id={id("countries")}
          type="text"
          autoComplete="off"
          autoCapitalize="characters"
          value={draft.countries}
          disabled={pending}
          aria-describedby={`${id("countries")}-hint`}
          aria-invalid={invalid("countries")}
          required
          onChange={(event) => {
            text("countries")(event.target.value.toUpperCase());
          }}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id={id("age-min")}
          label={t("ageMin")}
          problem={problemOf("ages")}
        >
          <Input
            id={id("age-min")}
            type="text"
            inputMode="numeric"
            value={draft.ageMin}
            disabled={pending}
            aria-invalid={invalid("ages")}
            required
            onChange={(event) => {
              text("ageMin")(event.target.value);
            }}
          />
        </Field>
        <Field
          id={id("age-max")}
          label={t("ageMax")}
          hint={t("agesHint", { max: maxBoostAge, min: minBoostAge })}
        >
          <Input
            id={id("age-max")}
            type="text"
            inputMode="numeric"
            value={draft.ageMax}
            disabled={pending}
            aria-describedby={`${id("age-max")}-hint`}
            aria-invalid={invalid("ages")}
            required
            onChange={(event) => {
              text("ageMax")(event.target.value);
            }}
          />
        </Field>
      </div>
      {inEu ? (
        <fieldset className="flex flex-col gap-4">
          <legend className="text-muted-foreground mb-2 text-xs">
            {t("partiesHint")}
          </legend>
          <Field
            id={id("beneficiary")}
            label={t("beneficiary")}
            problem={problemOf("beneficiary")}
          >
            <Input
              id={id("beneficiary")}
              type="text"
              maxLength={maxBoostPartyLength}
              value={draft.beneficiary}
              disabled={pending}
              aria-invalid={invalid("beneficiary")}
              required
              onChange={(event) => {
                text("beneficiary")(event.target.value);
              }}
            />
          </Field>
          <Field
            id={id("payer")}
            label={t("payer")}
            problem={problemOf("payer")}
          >
            <Input
              id={id("payer")}
              type="text"
              maxLength={maxBoostPartyLength}
              value={draft.payer}
              disabled={pending}
              aria-invalid={invalid("payer")}
              required
              onChange={(event) => {
                text("payer")(event.target.value);
              }}
            />
          </Field>
        </fieldset>
      ) : null}
      <div className="flex items-start gap-3">
        <Checkbox
          id={id("declaration")}
          className="mt-0.5"
          checked={draft.declared}
          disabled={pending}
          aria-describedby={`${id("declaration")}-hint`}
          onCheckedChange={(declared) => {
            onChange({ ...draft, declared });
          }}
        />
        <div className="flex flex-col gap-1">
          <Label htmlFor={id("declaration")}>{t("declaration")}</Label>
          <p
            id={`${id("declaration")}-hint`}
            className="text-muted-foreground text-xs"
          >
            {t("declarationHint")}
          </p>
        </div>
      </div>
      <div>
        <Button
          type="submit"
          disabled={pending || !draft.declared}
          focusableWhenDisabled
        >
          {pending ? t("reviewing") : t("review")}
        </Button>
      </div>
    </form>
  );
};

const Line = ({
  children,
  label,
}: {
  readonly children: ReactNode;
  readonly label: string;
}) => (
  <div className="flex flex-col gap-0.5">
    <dt className="text-muted-foreground text-xs">{label}</dt>
    <dd className="text-sm">{children}</dd>
  </div>
);

// How much of a post's text the summary quotes.
const excerptLength = 140;

interface BoostSummaryViewProps {
  readonly account: AdAccount;
  /** The boost as it will be sent. */
  readonly boost: NewBoost;
  /** The channel the post is boosted on, by name. */
  readonly channel: string;
  /** Why sending the boost failed last. */
  readonly error: AdsError | null;
  readonly onBack: () => void;
  readonly onConfirm: () => void;
  readonly pending: boolean;
  readonly postText: string;
  /** What the server says the boost would commit, and the room it has. */
  readonly quote: BoostQuote;
}

/**
 * What a boost is, read before the last button: the post and its channel,
 * who sees it, when it runs, its budget, the most it can cost, the monthly
 * ceiling and what is already committed, and the ad account whose payment
 * method the ad network charges. The button names the amount and the end.
 */
export const BoostSummaryView = ({
  account,
  boost,
  channel,
  error,
  onBack,
  onConfirm,
  pending,
  postText,
  quote,
}: BoostSummaryViewProps) => {
  const t = useTranslations("Ads.boost.summary");
  const format = useFormatter();
  const locale = useLocale();
  const money = useMoney();
  const { currency, minorUnitDigits: digits } = quote;
  const { timeZone } = account;
  const regions = new Intl.DisplayNames(locale, { type: "region" });
  const written = postText.trim();

  // The run is on the account's calendar, so it is written in its zone.
  const instant = (at: DateTime.Utc) =>
    format.dateTime(DateTime.toDate(at), {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone,
    });

  const amount = (minor: number) => money(minor, currency, digits);

  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-medium">{t("title")}</h3>
      <AdsErrorAlert error={error} digits={digits} />
      <dl className="flex flex-col gap-3">
        <Line label={t("post")}>
          <span className="whitespace-pre-wrap">
            {written === ""
              ? t("noText")
              : t("excerpt", {
                  cut: written.length > excerptLength ? "true" : "false",
                  text: written.slice(0, excerptLength),
                })}
          </span>
        </Line>
        <Line label={t("channel")}>{channel}</Line>
        <Line label={t("audience")}>
          {t("audienceValue", {
            ageMax: boost.audience.ageMax,
            ageMin: boost.audience.ageMin,
            countries: format.list(
              boost.audience.countries.map((code) => regions.of(code) ?? code),
              { type: "conjunction" }
            ),
            open: boost.audience.ageMax === maxBoostAge ? "true" : "false",
          })}
        </Line>
        {boost.beneficiary === undefined ? null : (
          <Line label={t("beneficiary")}>{boost.beneficiary}</Line>
        )}
        {boost.payer === undefined ? null : (
          <Line label={t("payer")}>{boost.payer}</Line>
        )}
        <Line label={t("run")}>
          {t("runValue", {
            days: quote.days,
            end: instant(quote.endsAt),
            start: instant(quote.startsAt),
            zone: timeZone.replaceAll("_", " "),
          })}
        </Line>
        <Line label={t("budget")}>
          {t("budgetValue", {
            amount: amount(boost.budget.amount),
            kind: boost.budget.kind,
          })}
        </Line>
        <Line label={t("most")}>
          <strong className="text-base font-semibold">
            {amount(quote.commitment)}
          </strong>
          <span className="text-muted-foreground block text-xs">
            {t("mostExplained", {
              days: quote.days,
              kind: boost.budget.kind,
              percent: dailyOverspendPercent,
            })}
          </span>
        </Line>
        <Line label={t("ceiling")}>{amount(quote.ceiling)}</Line>
        <Line label={t("committed")}>{amount(quote.committed)}</Line>
        {quote.capRoom === null ? null : (
          <Line label={t("capRoom")}>{amount(quote.capRoom)}</Line>
        )}
        <Line label={t("account")}>
          {account.name}
          <span className="text-muted-foreground block text-xs">
            {t("billing")}
          </span>
        </Line>
      </dl>
      <Alert>
        <AlertDescription>{t("after")}</AlertDescription>
      </Alert>
      <div className="flex flex-wrap gap-2">
        <Button disabled={pending} focusableWhenDisabled onClick={onConfirm}>
          {pending
            ? t("confirming")
            : t("confirm", {
                amount: amount(quote.commitment),
                date: format.dateTime(DateTime.toDate(quote.endsAt), {
                  day: "numeric",
                  month: "short",
                  timeZone,
                }),
              })}
        </Button>
        <Button
          variant="outline"
          disabled={pending}
          focusableWhenDisabled
          onClick={onBack}
        >
          {t("back")}
        </Button>
      </div>
    </div>
  );
};
