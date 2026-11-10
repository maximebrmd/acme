"use client";

import { useAtomSet } from "@effect/atom-react";
import { Exit, Option, Schema } from "effect";
import { useTranslations } from "next-intl";
import type { LegalAnswer, LegalCover } from "peal-contract";
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
import { useId, useState, useTransition } from "react";
import type { ChangeEvent, SubmitEvent } from "react";

import { LegalAnswerView } from "#components/staff/legal-answer-view.tsx";
import { useRouter } from "#i18n/navigation.ts";
import { answerLegalRequest } from "#staff/atoms.ts";
import { staffErrorKey } from "#staff/errors.ts";
import type { StaffErrorKey } from "#staff/errors.ts";
import {
  legalCovers,
  legalRequestOf,
  subjectKinds,
} from "#staff/legal-request.ts";
import type { LegalRequestFields, SubjectKind } from "#staff/legal-request.ts";

const isSubjectKind = Schema.is(Schema.Literals(subjectKinds));

const blank: LegalRequestFields = {
  authority: "",
  covers: [],
  identifier: "",
  kind: "email",
  legalBasis: "",
  reference: "",
  since: "",
  until: "",
};

type TextField =
  | "authority"
  | "identifier"
  | "legalBasis"
  | "reference"
  | "since"
  | "until";

// One line of the request, with what to write in it.
const Field = ({
  hint,
  label,
  maxLength,
  onChange,
  required = false,
  type = "text",
  value,
}: {
  readonly hint?: string;
  readonly label: string;
  readonly maxLength?: number;
  readonly onChange: (value: string) => void;
  readonly required?: boolean;
  readonly type?: "date" | "text";
  readonly value: string;
}) => {
  const id = useId();
  const hintId = useId();

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        maxLength={maxLength}
        required={required}
        autoComplete="off"
        aria-describedby={hint === undefined ? undefined : hintId}
        onChange={handleChange}
      />
      {hint === undefined ? null : (
        <p id={hintId} className="text-muted-foreground text-sm">
          {hint}
        </p>
      )}
    </div>
  );
};

// One category the request may ask for.
const Cover = ({
  checked,
  cover,
  onChange,
}: {
  readonly checked: boolean;
  readonly cover: LegalCover;
  readonly onChange: (cover: LegalCover, checked: boolean) => void;
}) => {
  const t = useTranslations("Staff.legal.form.cover");
  const id = useId();

  const handleChange = (next: boolean) => {
    onChange(cover, next);
  };

  return (
    <div className="flex items-start gap-3">
      <Checkbox id={id} checked={checked} onCheckedChange={handleChange} />
      <Label htmlFor={id}>{t(cover)}</Label>
    </div>
  );
};

/**
 * A legal request, as the authority's document makes it: whom it names,
 * who asks, under which reference and legal basis, and what for. Sending
 * it records it under the staff member's name, then shows what it covers
 * and nothing else; the page's list of past answers is read again after.
 */
export const LegalRequestForm = () => {
  const t = useTranslations("Staff.legal.form");
  const errors = useTranslations("Staff.errors");
  const router = useRouter();
  const kindId = useId();
  const coversId = useId();
  const answer = useAtomSet(answerLegalRequest, { mode: "promiseExit" });
  const [fields, setFields] = useState(blank);
  const [error, setError] = useState<StaffErrorKey | null>(null);

  const [answered, setAnswered] = useState<Option.Option<LegalAnswer>>(
    Option.none()
  );

  const [isPending, startTransition] = useTransition();
  const request = legalRequestOf(fields);

  const set = (name: TextField) => (value: string) => {
    setFields((current) => ({ ...current, [name]: value }));
  };

  const handleKind = (value: SubjectKind | null) => {
    if (isSubjectKind(value)) {
      setFields((current) => ({ ...current, kind: value }));
    }
  };

  const handleCover = (cover: LegalCover, checked: boolean) => {
    setFields((current) => ({
      ...current,
      covers: legalCovers.filter((listed) =>
        listed === cover ? checked : current.covers.includes(listed)
      ),
    }));
  };

  const handleSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (Option.isNone(request)) {
      return;
    }

    startTransition(async () => {
      const exit = await answer({ payload: request.value });

      setError(Option.getOrNull(staffErrorKey(exit)));
      setAnswered(
        Exit.isSuccess(exit) ? Option.some(exit.value) : Option.none()
      );
      // The answer was recorded: the list of past answers shows it.
      router.refresh();
    });
  };

  const handleClear = () => {
    setAnswered(Option.none());
    setFields(blank);
  };

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor={kindId}>{t("kind")}</Label>
            <Select
              items={subjectKinds.map((kind) => ({
                label: t(`kinds.${kind}`),
                value: kind,
              }))}
              value={fields.kind}
              onValueChange={handleKind}
            >
              <SelectTrigger id={kindId}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {subjectKinds.map((kind) => (
                  <SelectItem key={kind} value={kind}>
                    {t(`kinds.${kind}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Field
            label={t("identifier")}
            hint={t("identifierHint")}
            maxLength={320}
            required
            value={fields.identifier}
            onChange={set("identifier")}
          />
          <Field
            label={t("authority")}
            hint={t("authorityHint")}
            maxLength={300}
            required
            value={fields.authority}
            onChange={set("authority")}
          />
          <Field
            label={t("reference")}
            hint={t("referenceHint")}
            maxLength={300}
            required
            value={fields.reference}
            onChange={set("reference")}
          />
        </div>
        <Field
          label={t("legalBasis")}
          hint={t("legalBasisHint")}
          maxLength={300}
          required
          value={fields.legalBasis}
          onChange={set("legalBasis")}
        />
        <fieldset
          aria-describedby={coversId}
          className="flex flex-col gap-3 rounded-lg border p-4"
        >
          <legend className="px-1 text-sm font-medium">{t("covers")}</legend>
          <p id={coversId} className="text-muted-foreground text-sm">
            {t("coversHint")}
          </p>
          {legalCovers.map((cover) => (
            <Cover
              key={cover}
              cover={cover}
              checked={fields.covers.includes(cover)}
              onChange={handleCover}
            />
          ))}
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t("since")}
            type="date"
            value={fields.since}
            onChange={set("since")}
          />
          <Field
            label={t("until")}
            type="date"
            hint={t("periodHint")}
            value={fields.until}
            onChange={set("until")}
          />
        </div>
        {error === null ? null : (
          <Alert variant="destructive">
            <AlertDescription>{errors(error)}</AlertDescription>
          </Alert>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            disabled={Option.isNone(request) || isPending}
            focusableWhenDisabled
          >
            {isPending ? t("pending") : t("submit")}
          </Button>
          {Option.isNone(request) ? (
            <p className="text-muted-foreground text-sm">{t("incomplete")}</p>
          ) : null}
        </div>
      </form>
      {Option.isSome(answered) ? (
        <div className="flex flex-col gap-4 border-t pt-6">
          <LegalAnswerView answer={answered.value} />
          <div>
            <Button variant="outline" onClick={handleClear}>
              {t("clear")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
